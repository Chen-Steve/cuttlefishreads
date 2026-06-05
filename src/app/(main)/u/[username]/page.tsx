import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { User } from "lucide-react";

import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getPublicProfile, getUserBookmarkedNovels } from "@/lib/data";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  return { title: profile ? `${profile.username}'s profile` : "Profile not found" };
}

export default async function PublicProfilePage({
  params,
}: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const novels = await getUserBookmarkedNovels(profile.id);

  return (
    <PageContainer as="section">
      <header className="mb-8 flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <User className="size-7 text-accent" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {profile.username}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {novels.length} {novels.length === 1 ? "bookmark" : "bookmarks"}
          </p>
        </div>
      </header>

      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
        Bookmarks
      </h2>

      {novels.length > 0 ? (
        <NovelGrid novels={novels} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center sm:py-16">
          <p className="text-sm text-muted">
            {profile.username} hasn&apos;t bookmarked any novels yet.
          </p>
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
