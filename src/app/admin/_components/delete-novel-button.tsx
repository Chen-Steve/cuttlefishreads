"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteNovel } from "../actions";
import { ConfirmDialog } from "./confirm-dialog";

export function DeleteNovelButton({
  novelId,
  title,
}: {
  novelId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteNovel(novelId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-rose-200 bg-background px-4 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
      >
        <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
        {pending ? "Deleting…" : "Delete"}
      </button>

      <ConfirmDialog
        open={open}
        title="Delete novel"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={confirmDelete}
      >
        This will permanently remove &ldquo;{title}&rdquo; and all its chapters.
      </ConfirmDialog>
    </>
  );
}
