import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { scrapeChapter } from "@/lib/scraper/chapter";
import { translateChapter } from "@/lib/translate";

export const runtime = "nodejs";
export const maxDuration = 300;

type ImportBody = {
  novelId?: string;
  url?: string;
  apiKey?: string;
  model?: string;
  targetLanguage?: string;
  access?: "free" | "paid";
  coinCost?: number;
};

export async function POST(request: Request) {
  const adminAccess = await getAdminAccess();
  if (!adminAccess?.isMasterAdmin) {
    return Response.json({ ok: false, error: "Not authorized." }, { status: 403 });
  }

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const novelId = String(body.novelId ?? "").trim();
  const url = String(body.url ?? "").trim();
  const targetLanguage = String(body.targetLanguage ?? "English").trim() || "English";
  const access = body.access === "paid" ? "paid" : "free";
  const isFree = access === "free";
  const coinCost = isFree ? 0 : Math.max(1, Math.floor(Number(body.coinCost ?? 0)));

  if (!novelId) {
    return Response.json({ ok: false, error: "Missing novel id." }, { status: 400 });
  }
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ ok: false, error: "A valid http(s) chapter URL is required." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: novel } = await admin
    .from("novels")
    .select("id, slug, publisher_id")
    .eq("id", novelId)
    .maybeSingle();
  if (!novel) {
    return Response.json({ ok: false, error: "That novel no longer exists." }, { status: 404 });
  }
  // Scrape first — cheap, and we always need the "next chapter" link even when
  // this chapter was already imported (so a re-run can resume past it).
  let scraped;
  try {
    scraped = await scrapeChapter(url);
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to scrape chapter." },
      { status: 502 },
    );
  }

  // Resume support: skip translation + insert if this URL is already imported.
  const { data: existing } = await admin
    .from("chapters")
    .select("number, title")
    .eq("novel_id", novelId)
    .eq("source_url", scraped.finalUrl)
    .maybeSingle();

  if (existing) {
    return Response.json({
      ok: true,
      status: "skipped",
      number: existing.number,
      title: existing.title,
      sourceUrl: scraped.finalUrl,
      nextUrl: scraped.nextUrl,
    });
  }

  // Translate.
  let translated;
  try {
    translated = await translateChapter({
      title: scraped.title,
      paragraphs: scraped.paragraphs,
      targetLanguage,
      apiKey: body.apiKey?.trim() || undefined,
      model: body.model?.trim() || undefined,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Translation failed." },
      { status: 502 },
    );
  }

  // Next chapter number = max + 1 for this novel.
  const { data: last } = await admin
    .from("chapters")
    .select("number")
    .eq("novel_id", novelId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (last?.number ?? 0) + 1;

  const { error: insertError } = await admin.from("chapters").insert({
    novel_id: novelId,
    number,
    title: translated.title,
    content: translated.content,
    is_free: isFree,
    coin_cost: coinCost,
    is_published: false,
    source_url: scraped.finalUrl,
  });

  if (insertError) {
    return Response.json(
      { ok: false, error: `Saving chapter failed: ${insertError.message}` },
      { status: 500 },
    );
  }

  revalidatePath(`/admin/novels/${novelId}/chapters`);

  return Response.json({
    ok: true,
    status: "imported",
    number,
    title: translated.title,
    sourceUrl: scraped.finalUrl,
    nextUrl: scraped.nextUrl,
  });
}
