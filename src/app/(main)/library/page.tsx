import type { Metadata } from "next";
import { LibraryGrid } from "@/components/library/library-grid";
import { PageContainer } from "@/components/page-container";
import { getLibraryNovels, isUserAuthenticated } from "@/lib/data";
import { toNovelCardData } from "@/lib/novel-card-data";

export const metadata: Metadata = {
  title: "Library",
};

export default async function LibraryPage() {
  const [bookmarked, loggedIn] = await Promise.all([
    getLibraryNovels(),
    isUserAuthenticated(),
  ]);

  return (
    <PageContainer as="section" className="pt-3 pb-6 sm:pt-4 sm:pb-8">
      <LibraryGrid
        bookmarked={bookmarked.map(toNovelCardData)}
        loggedIn={loggedIn}
      />
    </PageContainer>
  );
}
