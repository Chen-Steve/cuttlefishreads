"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, LogIn, MessageSquare } from "lucide-react";

import { createReply } from "@/app/(originals)/originals/forum/actions";
import { forumLoginUrl, MAX_POST_LENGTH } from "@/lib/forum/constants";

export function ReplyForm({
  threadId,
  isLoggedIn,
  isLocked,
}: {
  threadId: string;
  isLoggedIn: boolean;
  isLocked: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isLocked) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted">
        <Lock className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        This thread is locked. No new replies.
      </p>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Sign in to join this discussion.</p>
        <Link
          href={forumLoginUrl(`/forum/t/${threadId}`)}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <LogIn className="size-4" strokeWidth={1.75} aria-hidden />
          Sign in
        </Link>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createReply(threadId, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <label htmlFor="reply-body" className="sr-only">
        Write a reply
      </label>
      <textarea
        id="reply-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a reply…"
        rows={4}
        maxLength={MAX_POST_LENGTH}
        disabled={pending}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted tabular-nums">
          {body.length.toLocaleString()}/{MAX_POST_LENGTH.toLocaleString()}
        </span>
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageSquare className="size-4" strokeWidth={1.75} aria-hidden />
          {pending ? "Posting…" : "Post reply"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
