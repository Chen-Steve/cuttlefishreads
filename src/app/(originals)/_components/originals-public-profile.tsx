import Link from "next/link";
import { Coffee, Heart, User } from "lucide-react";

import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { ORIGINALS } from "@/lib/constants";
import { originalsPublicUrl } from "@/lib/hosts";
import type { Novel } from "@/types";

type OriginalsProfile = {
  username: string;
  avatarUrl?: string | null;
  kofiUrl?: string | null;
  patreonUrl?: string | null;
};

export function OriginalsPublicProfile({
  profile,
  originalSeries,
}: {
  profile: OriginalsProfile;
  originalSeries: Novel[];
}) {
  const isAuthor = originalSeries.length > 0;

  return (
    <PageContainer
      as="section"
      className="flex flex-col gap-6 pt-6 pb-8 sm:gap-7 sm:pb-10 lg:pb-12"
    >
      <header className="flex items-center gap-4 border-b border-border pb-5">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-accent/10">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <User
                className="size-7 text-accent"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {isAuthor ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              {ORIGINALS.shortName} author
            </p>
          ) : null}
          <h1
            className={`truncate text-2xl font-bold tracking-tight text-foreground ${
              isAuthor ? "mt-0.5" : ""
            }`}
          >
            {profile.username}
          </h1>
          {profile.kofiUrl || profile.patreonUrl ? (
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

      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Series
          </h2>
          <p className="text-xs text-muted tabular-nums">
            {originalSeries.length}
          </p>
        </div>
        {isAuthor ? (
          <NovelGrid
            novels={originalSeries}
            dense
            showChapterCount
            catalogBase="series"
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center">
            <p className="text-sm text-muted">
              {`${profile.username} hasn't published any original series yet.`}
            </p>
            <Link
              href={originalsPublicUrl()}
              className="mt-2 inline-flex text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Browse {ORIGINALS.shortName}
            </Link>
          </div>
        )}
      </section>
    </PageContainer>
  );
}
