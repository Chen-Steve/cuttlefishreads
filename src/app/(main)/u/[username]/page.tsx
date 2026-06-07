import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { User } from "lucide-react";

import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import {
  getPublicProfile,
  getUserBookmarkedNovels,
  getUserCreatedNovels,
} from "@/lib/data";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  return { title: profile ? `${profile.username}'s profile` : "Profile not found" };
}

function profileSummary(
  isTranslator: boolean,
  createdCount: number,
  bookmarkCount: number,
): string {
  if (isTranslator) {
    const translationLabel =
      createdCount === 1 ? "translation" : "translations";
    const bookmarkLabel = bookmarkCount === 1 ? "bookmark" : "bookmarks";
    return `${createdCount} ${translationLabel} · ${bookmarkCount} ${bookmarkLabel}`;
  }

  return `${bookmarkCount} ${bookmarkCount === 1 ? "bookmark" : "bookmarks"}`;
}

export default async function PublicProfilePage({
  params,
}: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const isTranslator = profile.role === "translator";
  const [createdNovels, bookmarkedNovels] = await Promise.all([
    isTranslator ? getUserCreatedNovels(profile.id) : Promise.resolve([]),
    getUserBookmarkedNovels(profile.id),
  ]);

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
            {profileSummary(
              isTranslator,
              createdNovels.length,
              bookmarkedNovels.length,
            )}
          </p>
        </div>
      </header>

      {isTranslator ? (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
            Translations
          </h2>

          {createdNovels.length > 0 ? (
            <NovelGrid novels={createdNovels} />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-12 text-center sm:py-16">
              <p className="text-sm text-muted">
                {profile.username} hasn&apos;t published any translations yet.
              </p>
            </div>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Bookmarks
        </h2>

        {bookmarkedNovels.length > 0 ? (
          <NovelGrid novels={bookmarkedNovels} />
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
      </section>
    </PageContainer>
  );
}
