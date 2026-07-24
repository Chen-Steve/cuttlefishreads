import type { Metadata } from "next";

import { LibraryGrid } from "@/components/library/library-grid";
import { PageContainer } from "@/components/page-container";
import { getLibraryNovels, isUserAuthenticated } from "@/lib/data";
import { getOriginalsCatalog, isOriginalNovel } from "@/lib/originals-data";
import { originalsPageMetadata } from "@/lib/seo";

export const metadata: Metadata = originalsPageMetadata({
  title: "Library",
  description: "Your bookmarked original series on Cuttlefish Originals.",
  path: "/library",
});

export default async function OriginalsLibraryPage() {
  const [bookmarked, catalog, loggedIn] = await Promise.all([
    getLibraryNovels(),
    getOriginalsCatalog(),
    isUserAuthenticated(),
  ]);

  return (
    <PageContainer as="section" className="pt-3 pb-6 sm:pt-4 sm:pb-8">
      <LibraryGrid
        bookmarked={bookmarked.filter(isOriginalNovel)}
        catalog={catalog}
        loggedIn={loggedIn}
      />
    </PageContainer>
  );
}
