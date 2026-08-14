"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronUp } from "lucide-react";

import { toggleCommunityVote } from "@/app/(main)/community/actions";
import { loginHref } from "@/lib/safe-return-path";
import { cn } from "@/lib/utils";

export function CommunityVoteButton({
  postId,
  initialVoted,
  initialCount,
  isLoggedIn,
  returnPath,
}: {
  postId: string;
  initialVoted: boolean;
  initialCount: number;
  isLoggedIn: boolean;
  returnPath: string;
}) {
  const router = useRouter();
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const className = cn(
    "inline-flex min-w-10 flex-col items-center justify-center rounded-lg border px-1.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    voted
      ? "border-accent/40 bg-accent/10 text-accent"
      : "border-border bg-background text-muted hover:border-accent hover:text-accent",
  );

  if (!isLoggedIn) {
    return (
      <Link
        href={loginHref(returnPath)}
        aria-label={`Vote, ${count} ${count === 1 ? "vote" : "votes"}. Sign in to vote`}
        className={className}
      >
        <ChevronUp className="size-4" strokeWidth={2} aria-hidden />
        {count}
      </Link>
    );
  }

  function handleClick() {
    setError(null);
    const nextVoted = !voted;
    setVoted(nextVoted);
    setCount((current) => current + (nextVoted ? 1 : -1));

    startTransition(async () => {
      const result = await toggleCommunityVote(postId);
      if (result.error) {
        setVoted(!nextVoted);
        setCount((current) => current + (nextVoted ? -1 : 1));
        setError(result.error);
        return;
      }
      setVoted(Boolean(result.voted));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={voted}
        aria-label={
          voted
            ? `Remove vote, ${count} ${count === 1 ? "vote" : "votes"}`
            : `Vote, ${count} ${count === 1 ? "vote" : "votes"}`
        }
        className={cn(className, "disabled:opacity-50")}
      >
        <ChevronUp className="size-4" strokeWidth={2} aria-hidden />
        {count}
      </button>
      {error ? (
        <p role="alert" className="max-w-16 text-center text-[10px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
