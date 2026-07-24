import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Coffee, Heart, User } from "lucide-react";

import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import {
  getPublicProfile,
  getUserBookmarkedNovels,
  getUserCreatedNovels,
} from "@/lib/data";
import type { Novel } from "@/types";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  return { title: profile ? `${profile.username}'s profile` : "Profile not found" };
}

function ProfileSection({
  title,
  count,
  empty,
  novels,
}: {
  title: string;
  count: number;
  empty: ReactNode;
  novels: Novel[];
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-xs text-muted tabular-nums">{count}</p>
      </div>

      {novels.length > 0 ? (
        <NovelGrid novels={novels} dense showChapterCount />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center">
          {empty}
        </div>
      )}
    </section>
  );
}

export default async function PublicProfilePage({
  params,
}: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const isTranslator = profile.isTranslator;
  const [createdNovels, bookmarkedNovels] = await Promise.all([
    getUserCreatedNovels(profile.id),
    getUserBookmarkedNovels(profile.id),
  ]);
  const translations = createdNovels.filter(
    (novel) => novel.publicationType !== "original",
  );
  const translationBookmarks = bookmarkedNovels.filter(
    (novel) => novel.publicationType !== "original",
  );

  return (
    <PageContainer
      as="section"
      className="flex flex-col gap-6 pt-4 pb-8 sm:gap-7 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12"
    >
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-accent/10">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <User className="size-5 text-accent" strokeWidth={1.75} aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {profile.username}
            </h1>
            {isTranslator ? (
              <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-accent">
                Translator
              </span>
            ) : null}
          </div>
          {isTranslator && (profile.kofiUrl || profile.patreonUrl) ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.kofiUrl ? (
                <a
                  href={profile.kofiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#13C3FF] px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Coffee className="size-3.5" strokeWidth={2} aria-hidden />
                  Ko-fi
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
              {profile.patreonUrl ? (
                <a
                  href={profile.patreonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#FF424D] px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Heart className="size-3.5" strokeWidth={2} aria-hidden />
                  Patreon
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {isTranslator || translations.length > 0 ? (
        <ProfileSection
          title="Translations"
          count={translations.length}
          novels={translations}
          empty={
            <p className="text-sm text-muted">
              {`${profile.username} hasn't published any translations yet.`}
            </p>
          }
        />
      ) : null}

      <ProfileSection
        title="Bookmarks"
        count={translationBookmarks.length}
        novels={translationBookmarks}
        empty={
          <>
            <p className="text-sm text-muted">
              {profile.username} hasn&apos;t bookmarked any novels yet.
            </p>
            <Link
              href="/novels"
              className="mt-2 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Browse novels
            </Link>
          </>
        }
      />
    </PageContainer>
  );
}
