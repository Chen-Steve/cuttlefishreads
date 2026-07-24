import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  WORKSPACE_BASE,
  WORKSPACE_LABELS,
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";
import { NovelForm } from "../_components/novel-form";
import type { PublicationType } from "@/lib/constants";

export async function WorkspaceNovelEditPage({
  workspace,
  novelId,
}: {
  workspace: WorkspaceKind;
  novelId: string;
}) {
  const base = WORKSPACE_BASE[workspace];

  const access = await getAdminAccess();
  const admin = createAdminClient();
  const { data: novel } = await admin
    .from("novels")
    .select(
      "id, title, original_author, translator, description, cover_url, genres, tags, status, language, publisher_id, novelupdates_url, publication_type, ownership_confirmed_at, copyright_type",
    )
    .eq("id", novelId)
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }
  // The two workspaces are strictly separated by publication type.
  if (novel.publication_type !== WORKSPACE_PUBLICATION_TYPE[workspace]) {
    notFound();
  }

  return (
    <PageContainer as="div" width="default">
      <Link
        href={base}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to {WORKSPACE_LABELS[workspace].noun === "series" ? "series" : "novels"}
      </Link>
      <div className="mt-4">
        <NovelForm
          novel={novel}
          publicationType={novel.publication_type as PublicationType}
        />
      </div>
    </PageContainer>
  );
}
