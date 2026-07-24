import type { Metadata } from "next";

import { WorkspaceCommentsPage } from "../_pages/comments-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CommentsPage() {
  return <WorkspaceCommentsPage workspace="translations" />;
}
