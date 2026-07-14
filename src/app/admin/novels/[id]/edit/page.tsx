import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { NovelForm } from "../../../_components/novel-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function EditNovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const access = await getAdminAccess();
  const admin = createAdminClient();
  const { data: novel } = await admin
    .from("novels")
    .select(
      "id, title, original_author, translator, description, cover_url, genres, tags, status, language, publisher_id, novelupdates_url",
    )
    .eq("id", id)
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }

  return (
    <PageContainer as="div" width="default">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to novels
      </Link>
      <div className="mt-4">
        <NovelForm novel={novel} />
      </div>
    </PageContainer>
  );
}
