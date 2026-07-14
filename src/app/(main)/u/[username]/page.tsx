import type { Metadata } from "next";
import type { ReactNode } from "react";
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

  const isTranslator = profile.role === "translator";
  const [createdNovels, bookmarkedNovels] = await Promise.all([
    isTranslator ? getUserCreatedNovels(profile.id) : Promise.resolve([]),
    getUserBookmarkedNovels(profile.id),
  ]);

  return (
    <PageContainer
      as="section"
      className="flex flex-col gap-6 pt-4 pb-8 sm:gap-7 sm:pt-5 sm:pb-10 lg:pt-6 lg:pb-12"
    >
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <User className="size-5 text-accent" strokeWidth={1.75} aria-hidden />
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
        </div>
      </header>

      {isTranslator ? (
        <ProfileSection
          title="Translations"
          count={createdNovels.length}
          novels={createdNovels}
          empty={
            <p className="text-sm text-muted">
              {profile.username} hasn&apos;t published any translations yet.
            </p>
          }
        />
      ) : null}

      <ProfileSection
        title="Bookmarks"
        count={bookmarkedNovels.length}
        novels={bookmarkedNovels}
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
