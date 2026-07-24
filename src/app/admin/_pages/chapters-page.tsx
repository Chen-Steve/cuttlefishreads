import Link from "next/link";
import { ChevronLeft, PlusCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { countWords } from "@/lib/utils";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import {
  WORKSPACE_BASE,
  WORKSPACE_LABELS,
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";
import {
  ChapterList,
  ChapterOrderToggle,
} from "../_components/chapter-list";
import { PublishAllButton } from "../_components/chapter-admin-actions";

type ChapterRow = {
  id: string;
  number: number;
  title: string;
  content: string;
  is_free: boolean;
  coin_cost: number;
  is_published: boolean;
  unlock_at: string | null;
};

export async function WorkspaceChaptersPage({
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
    .select("id, title, publisher_id, publication_type")
    .eq("id", novelId)
    .maybeSingle();

  if (!novel) notFound();
  if (!access || (!access.isMasterAdmin && novel.publisher_id !== access.userId)) {
    notFound();
  }
  if (novel.publication_type !== WORKSPACE_PUBLICATION_TYPE[workspace]) {
    notFound();
  }

  const { data: chapters } = await admin
    .from("chapters")
    .select(
      "id, number, title, content, is_free, coin_cost, is_published, unlock_at",
    )
    .eq("novel_id", novelId)
    .order("number", { ascending: true })
    .returns<ChapterRow[]>();

  const rows = (chapters ?? []).map(({ content, ...chapter }) => ({
    ...chapter,
    word_count: countWords(content),
  }));
  const draftCount = rows.filter((c) => !c.is_published).length;

  return (
    <PageContainer as="div">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link
              href={base}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
              Back to {WORKSPACE_LABELS[workspace].noun === "series" ? "series" : "novels"}
            </Link>
            <h1
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              title={novel.title}
            >
              {novel.title.length > 50
                ? `${novel.title.slice(0, 50)}...`
                : novel.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PublishAllButton novelId={novelId} draftCount={draftCount} />
          <ChapterOrderToggle />
          <Link
            href={`${base}/novels/${novelId}/chapters/new`}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <PlusCircle className="size-4" strokeWidth={1.75} aria-hidden />
            Add chapter
          </Link>
        </div>
      </div>

      <div className="mt-3">
        <ChapterList novelId={novelId} chapters={rows} />
      </div>
    </PageContainer>
  );
}
