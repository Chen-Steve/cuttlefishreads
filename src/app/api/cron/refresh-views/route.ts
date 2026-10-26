import { NextResponse } from "next/server";

import { revalidateNovelsDataCache } from "@/lib/data";
import { refreshCatalogViewCounts } from "@/lib/google-analytics";

/**
 * Daily Vercel Cron. Refreshes novels.view_count from GA4 when configured,
 * and touches the database either way so a quiet Supabase free project
 * is less likely to pause.
 *
 * Set CRON_SECRET on Vercel. Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized =
    typeof secret === "string" &&
    secret.length > 0 &&
    request.headers.get("authorization") === `Bearer ${secret}`;

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshCatalogViewCounts();
    if (result.updated) revalidateNovelsDataCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("refresh-views:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
