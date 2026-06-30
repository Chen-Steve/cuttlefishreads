import type { Metadata } from "next";
import Link from "next/link";
import { LibraryGrid } from "@/components/library/library-grid";
import { PageContainer } from "@/components/page-container";
import { getLibraryNovels, isUserAuthenticated } from "@/lib/data";

export const metadata: Metadata = {
  title: "Library",
};

export default async function LibraryPage() {
  const [novels, loggedIn] = await Promise.all([
    getLibraryNovels(),
    isUserAuthenticated(),
  ]);

  return (
    <PageContainer as="section" className="pt-4 pb-8 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12">
      {loggedIn && novels.length > 0 ? (
        <LibraryGrid novels={novels} />
      ) : (
        <>
          <header className="mb-6 sm:mb-7">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              My library
            </h1>
          </header>

          {!loggedIn ? (
            <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center sm:py-16">
              <p className="text-sm font-medium text-foreground">Sign in to build your library</p>
              <p className="mt-1 text-sm text-muted">Bookmark novels and pick up where you left off.</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Create account
                </Link>
              </div>
            </div>
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
        </>
      )}
    </PageContainer>
  );
}
