"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Eye, EyeOff, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { chapterExportFilename } from "@/lib/chapter-import";
import { slugify } from "@/lib/utils";
import {
  deleteChapter,
  deleteChapters,
  getChaptersForDownload,
  publishAllChapters,
  setChapterPublished,
} from "../actions";
import { ConfirmDialog } from "./confirm-dialog";

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

export function DeleteSelectedButton({
  novelId,
  chapterIds,
  onDeleted,
}: {
  novelId: string;
  chapterIds: string[];
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const count = chapterIds.length;

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteChapters(novelId, chapterIds);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      onDeleted();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending || count === 0}
        className="inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 dark:text-rose-400 dark:hover:text-rose-300"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
        )}
        Delete{count > 0 ? ` ${count}` : ""}
      </button>
      <ConfirmDialog
        open={open}
        title={count === 1 ? "Delete chapter" : "Delete chapters"}
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={confirmDelete}
      >
        This will permanently delete{" "}
        {count === 1 ? "this chapter" : `${count} chapters`}.
      </ConfirmDialog>
    </>
  );
}

const DOWNLOAD_CHUNK = 25;

export function DownloadChaptersButton({
  novelId,
  novelTitle,
  chapterIds,
  label = "Download",
}: {
  novelId: string;
  novelTitle: string;
  chapterIds: string[];
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function download() {
    if (chapterIds.length === 0) return;
    startTransition(async () => {
      try {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (let i = 0; i < chapterIds.length; i += DOWNLOAD_CHUNK) {
          const result = await getChaptersForDownload(
            novelId,
            chapterIds.slice(i, i + DOWNLOAD_CHUNK),
          );
          if (result.error || !result.chapters) {
            toast.error(result.error ?? "Could not download chapters.");
            return;
          }
          for (const chapter of result.chapters) {
            zip.file(
              chapterExportFilename(chapter.number, chapter.title),
              chapter.content ?? "",
            );
          }
        }
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${slugify(novelTitle) || "chapters"}.zip`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch {
        toast.error("Could not download chapters.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={pending || chapterIds.length === 0}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs font-semibold text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Download className="size-3.5" strokeWidth={1.75} aria-hidden />
      )}
      {label}
    </button>
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
      className="inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
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
