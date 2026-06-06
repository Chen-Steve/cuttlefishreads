import type { Metadata } from "next";
import { NovelGrid } from "@/components/novel";
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
    <PageContainer as="section">
      <header className="mb-6 sm:mb-7">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          All novels
        </h1>
        <p className="mt-1 text-sm text-muted">
          {novels.length} title{novels.length !== 1 ? "s" : ""} in the collection
        </p>
      </header>
      <NovelGrid novels={novels} />
    </PageContainer>
  );
}
