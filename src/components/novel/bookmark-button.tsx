"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, LogIn } from "lucide-react";

import { toggleBookmark } from "@/app/(main)/novels/actions";

export function BookmarkButton({
  novelSlug,
  initialBookmarked,
  isLoggedIn,
}: {
  novelSlug: string;
  initialBookmarked: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <LogIn className="size-4" strokeWidth={1.75} aria-hidden />
        Sign in to add to library
      </Link>
    );
  }

  function handleClick() {
    setError(null);
    const next = !bookmarked;
    setBookmarked(next);

    startTransition(async () => {
      const result = await toggleBookmark(novelSlug);
      if (result.error) {
        setBookmarked(!next);
        setError(result.error);
        return;
      }
      setBookmarked(Boolean(result.bookmarked));
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={bookmarked}
        className={
          bookmarked
            ? "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-accent/10 px-5 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {bookmarked ? (
          <BookmarkCheck className="size-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <Bookmark className="size-4" strokeWidth={1.75} aria-hidden />
        )}
        {bookmarked ? "In your library" : "Add to library"}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
