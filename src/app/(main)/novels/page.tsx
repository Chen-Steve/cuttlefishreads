import type { Metadata } from "next";
import { NovelsBrowser } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getNovels } from "@/lib/data";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "All Novels",
  description:
    "Browse every novel on Cuttlefish Reads, including popular, niche, ongoing, and completed web novels.",
  path: "/novels",
});

export default async function NovelsPage() {
  const novels = await getNovels();

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12">
      <NovelsBrowser novels={novels} />
    </PageContainer>
  );
}
