import type { Metadata } from "next";
import Link from "next/link";
import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getLibraryNovels } from "@/lib/data";

export const metadata: Metadata = {
  title: "Library",
};

export default function LibraryPage() {
  const novels = getLibraryNovels();

  return (
    <PageContainer as="section">
      <header className="mb-6 sm:mb-7">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          My library
        </h1>
        <p className="mt-1 text-sm text-muted">
          Novels you are following
        </p>
      </header>

      {novels.length > 0 ? (
        <NovelGrid novels={novels} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center sm:py-16">
          <p className="text-sm text-muted">Your library is empty.</p>
          <Link
            href="/novels"
            className="mt-3 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Browse novels
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
