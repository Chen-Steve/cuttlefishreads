import type { Metadata } from "next";
import { LibraryGrid } from "@/components/library/library-grid";
import { PageContainer } from "@/components/page-container";
import { getLibraryNovels, getNovels, isUserAuthenticated } from "@/lib/data";

export const metadata: Metadata = {
  title: "Library",
};

export default async function LibraryPage() {
  const [bookmarked, catalog, loggedIn] = await Promise.all([
    getLibraryNovels(),
    getNovels(),
    isUserAuthenticated(),
  ]);

  return (
    <PageContainer as="section" className="pt-3 pb-6 sm:pt-4 sm:pb-8">
      <LibraryGrid
        bookmarked={bookmarked}
        catalog={catalog}
        loggedIn={loggedIn}
      />
    </PageContainer>
  );
}
