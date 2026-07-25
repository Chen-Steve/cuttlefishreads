"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, PenLine } from "lucide-react";

import { createThread } from "@/app/(originals)/originals/forum/actions";
import {
  forumLoginUrl,
  forumThreadUrl,
  MAX_POST_LENGTH,
  MAX_THREAD_TITLE_LENGTH,
} from "@/lib/forum/constants";

export function NewThreadForm({
  categorySlug,
  categoryName,
  isLoggedIn,
  canPost,
}: {
  categorySlug: string;
  categoryName: string;
  isLoggedIn: boolean;
  canPost: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Sign in to start a thread in {categoryName}.
        </p>
        <Link
          href={forumLoginUrl(`/forum/c/${categorySlug}`)}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <LogIn className="size-4" strokeWidth={1.75} aria-hidden />
          Sign in
        </Link>
      </div>
    );
  }

  if (!canPost) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted">
        Only moderators can start threads in {categoryName}.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <PenLine className="size-4" strokeWidth={1.75} aria-hidden />
        Start a thread
      </button>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createThread(categorySlug, title, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.threadId) {
        router.push(forumThreadUrl(result.threadId));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <label
        htmlFor="thread-title"
        className="text-xs font-semibold uppercase tracking-[0.14em] text-accent"
      >
        New thread
      </label>
      <input
        id="thread-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Thread title"
        maxLength={MAX_THREAD_TITLE_LENGTH}
        disabled={pending}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      />

      <label htmlFor="thread-body" className="sr-only">
        Opening post
      </label>
      <textarea
        id="thread-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Say what is on your mind…"
        rows={5}
        maxLength={MAX_POST_LENGTH}
        disabled={pending}
        className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted tabular-nums">
          {body.length.toLocaleString()}/{MAX_POST_LENGTH.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={pending}
            className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !title.trim() || !body.trim()}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PenLine className="size-4" strokeWidth={1.75} aria-hidden />
            {pending ? "Posting…" : "Post thread"}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
