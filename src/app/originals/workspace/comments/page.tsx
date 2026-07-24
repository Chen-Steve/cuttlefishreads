import type { Metadata } from "next";

import { WorkspaceCommentsPage } from "@/app/admin/_pages/comments-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthorCommentsPage() {
  return <WorkspaceCommentsPage workspace="originals" />;
}
