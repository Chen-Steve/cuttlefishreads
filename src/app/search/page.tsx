import type { Metadata } from "next";
import { Search } from "lucide-react";
import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { searchNovels } from "@/lib/data";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = query ? searchNovels(query) : [];

  return (
    <PageContainer as="section">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Search
      </h1>

      <form role="search" action="/search" className="mt-5 max-w-xl">
        <label className="flex h-11 w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface py-0 pr-4 pl-4 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <Search
            className="size-4 shrink-0 text-muted"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search novels, authors, genres…"
            className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium leading-none text-foreground outline-none placeholder:text-muted/80"
            aria-label="Search"
          />
        </label>
      </form>

      <div className="mt-8">
        {query ? (
          <>
            <p className="mb-5 text-sm text-muted">
              {results.length} result{results.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-foreground">
                &ldquo;{query}&rdquo;
              </span>
            </p>
            <NovelGrid novels={results} />
          </>
        ) : (
          <p className="text-sm text-muted">
            Type above to search the collection.
          </p>
        )}
      </div>
    </PageContainer>
  );
}
