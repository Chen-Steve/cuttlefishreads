"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

import { toggleBookmark } from "@/app/(main)/novels/actions";
import { loginHref } from "@/lib/safe-return-path";

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
  const pathname = usePathname();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      const returnPath = pathname || `/novels/${novelSlug}`;
      toast("Sign in to Bookmark", {
        action: {
          label: "Sign in",
          onClick: () => router.push(loginHref(returnPath)),
        },
      });
      return;
    }

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

  const label = bookmarked && isLoggedIn ? "In your library" : "Bookmark";

  return (
    <div className="flex w-auto shrink-0 flex-col gap-1.5 sm:w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={label}
        aria-pressed={isLoggedIn ? bookmarked : false}
        className={
          bookmarked && isLoggedIn
            ? "inline-flex h-11 w-11 items-center justify-center gap-2 rounded-xl border border-accent bg-accent/10 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-full sm:px-5"
            : "inline-flex h-11 w-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-full sm:px-5"
        }
      >
        {bookmarked && isLoggedIn ? (
          <BookmarkCheck className="size-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <Bookmark className="size-4" strokeWidth={1.75} aria-hidden />
        )}
        <span className="sr-only sm:not-sr-only">{label}</span>
      </button>
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
