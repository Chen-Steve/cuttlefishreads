import type { Metadata } from "next";
import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getNovels } from "@/lib/data";

export const metadata: Metadata = {
  title: "Novels",
};

export default function NovelsPage() {
  const novels = getNovels();

  return (
    <PageContainer as="section">
      <header className="mb-6 sm:mb-7">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          All novels
        </h1>
        <p className="mt-1 text-sm text-muted">
          {novels.length} titles in the collection
        </p>
      </header>
      <NovelGrid novels={novels} />
    </PageContainer>
  );
}
