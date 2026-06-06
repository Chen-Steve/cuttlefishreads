"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { toggleCommentLike } from "@/app/(main)/novels/actions";

export function CommentLikeButton({
  commentId,
  initialLiked,
  initialCount,
  isLoggedIn,
}: {
  commentId: string;
  initialLiked: boolean;
  initialCount: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        disabled
        title="Sign in to like"
        aria-label={`Like — sign in to like comments`}
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted/50"
      >
        <Heart className="size-3.5" strokeWidth={1.75} aria-hidden />
        {count > 0 ? count : "Like"}
      </button>
    );
  }

  function handleClick() {
    setError(null);
    const nextLiked = !liked;
    const nextCount = nextLiked ? count + 1 : count - 1;
    setLiked(nextLiked);
    setCount(nextCount);

    startTransition(async () => {
      const result = await toggleCommentLike(commentId);
      if (result.error) {
        setLiked(!nextLiked);
        setCount(count);
        setError(result.error);
        return;
      }
      setLiked(Boolean(result.liked));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={liked}
        className={
          liked
            ? "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            : "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        }
      >
        <Heart
          className="size-3.5"
          strokeWidth={1.75}
          fill={liked ? "currentColor" : "none"}
          aria-hidden
        />
        {count > 0 ? count : "Like"}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
