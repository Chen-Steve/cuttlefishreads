"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Trash2, UploadCloud } from "lucide-react";

import {
  deleteChapter,
  publishAllChapters,
  setChapterPublished,
} from "../actions";

export function ChapterRowActions({
  chapterId,
  isPublished,
}: {
  chapterId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function togglePublished() {
    setError(null);
    startTransition(async () => {
      const res = await setChapterPublished(chapterId, !isPublished);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function remove() {
    if (!confirm("Delete this chapter permanently?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteChapter(chapterId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={togglePublished}
        disabled={pending}
        title={isPublished ? "Unpublish" : "Publish"}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : isPublished ? (
          <EyeOff className="size-3.5" strokeWidth={1.75} aria-hidden />
        ) : (
          <Eye className="size-3.5" strokeWidth={1.75} aria-hidden />
        )}
        <span className="hidden sm:inline">
          {isPublished ? "Unpublish" : "Publish"}
        </span>
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        title="Delete"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-background px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50"
      >
        <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Delete</span>
      </button>
      {error && (
        <span className="text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function PublishAllButton({
  novelId,
  draftCount,
}: {
  novelId: string;
  draftCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (draftCount === 0) return null;

  function publishAll() {
    if (!confirm(`Publish all ${draftCount} draft chapters?`)) return;
    startTransition(async () => {
      await publishAllChapters(novelId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={publishAll}
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <UploadCloud className="size-4" strokeWidth={1.75} aria-hidden />
      )}
      Publish {draftCount} draft{draftCount !== 1 ? "s" : ""}
    </button>
  );
}
