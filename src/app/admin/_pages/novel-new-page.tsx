import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import {
  WORKSPACE_BASE,
  WORKSPACE_LABELS,
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";
import { NovelForm } from "../_components/novel-form";

export function WorkspaceNovelNewPage({
  workspace,
}: {
  workspace: WorkspaceKind;
}) {
  const base = WORKSPACE_BASE[workspace];

  return (
    <PageContainer as="div" width="default">
      <NovelForm
        publicationType={WORKSPACE_PUBLICATION_TYPE[workspace]}
        header={
          <>
            <Link
              href={base}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
              Back to {WORKSPACE_LABELS[workspace].noun === "series" ? "series" : "novels"}
            </Link>
          </>
        }
      />
    </PageContainer>
  );
}
