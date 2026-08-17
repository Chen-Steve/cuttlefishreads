import type { Metadata } from "next";

import { CommunityPageBoard } from "@/components/community/community-board";
import { PageContainer } from "@/components/page-container";
import { getCommunityBoard, COMMUNITY_PAGE_LIMIT } from "@/lib/community";
import { publicPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = publicPageMetadata({
  title: "Community",
  description: `Community on ${SITE.name}.`,
  path: "/community",
});

export default async function CommunityPage() {
  const board = await getCommunityBoard(COMMUNITY_PAGE_LIMIT);

  return (
    <PageContainer width="narrow" className="pt-6 pb-10 sm:py-10">
      <h1 className="sr-only">Community</h1>
      <CommunityPageBoard posts={board.posts} isLoggedIn={board.isLoggedIn} />
    </PageContainer>
  );
}
