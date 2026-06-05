import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { NovelForm } from "../../../_components/novel-form";

export const metadata: Metadata = {
  title: "Admin — Edit Novel",
  robots: { index: false, follow: false },
};

export default async function EditNovelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();
  const { data: novel } = await admin
    .from("novels")
    .select(
      "id, title, original_author, translator, description, cover_url, genres, tags, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!novel) notFound();

  return (
    <PageContainer as="div" width="prose">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to novels
      </Link>
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <NovelForm novel={novel} />
      </div>
    </PageContainer>
  );
}
