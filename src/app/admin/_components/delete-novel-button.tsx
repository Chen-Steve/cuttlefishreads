"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteNovel } from "../actions";

export function DeleteNovelButton({
  novelId,
  title,
}: {
  novelId: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Delete "${title}"? This will permanently remove the novel and all its chapters.`,
          )
        ) {
          return;
        }

        startTransition(async () => {
          const result = await deleteNovel(novelId);
          if (result.error) {
            window.alert(result.error);
          }
        });
      }}
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-background px-4 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
