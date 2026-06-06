import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { ImportRunner } from "../../../_components/import-runner";

export const metadata: Metadata = {
  title: "Admin — Import chapters",
  robots: { index: false, follow: false },
};

export default async function ImportChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const access = await getAdminAccess();
  const admin = createAdminClient();
  const { data: novel } = await admin
    .from("novels")
    .select("id, title, publisher_id")
    .eq("id", id)
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }

  return (
    <PageContainer as="div" width="prose">
      <Link
        href={`/admin/novels/${id}/chapters`}
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to chapters
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
        Import &amp; translate chapters
      </h1>
      <p className="mt-1 text-sm text-muted">
        Paste a source chapter URL. Each chapter is scraped, translated, and saved
        as an unpublished draft so you can review before publishing.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <ImportRunner novelId={novel.id} novelTitle={novel.title} />
      </div>
    </PageContainer>
  );
}
