import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getWorkspaceComments, TOP_COMMENTS_LIMIT } from "@/lib/data/workspace";

import { CommentsManager } from "../comments/_components/comments-manager";

export async function WorkspaceCommentsPage() {
  const access = await getAdminAccess();
  if (!access) notFound();

  const { groups, truncated: commentsTruncated } = await getWorkspaceComments(access);

  return (
    <PageContainer as="div">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Comments
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        Reader comments across your{" "}
        novels. Reply directly to
        start a thread.
        {commentsTruncated
          ? ` Showing the ${TOP_COMMENTS_LIMIT} most recent.`
          : null}
      </p>

      <div className="mt-6">
        <CommentsManager groups={groups} />
      </div>
    </PageContainer>
  );
}
