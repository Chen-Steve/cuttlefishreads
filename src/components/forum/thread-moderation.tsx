"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { moderateThread } from "@/app/(originals)/originals/forum/actions";
import { forumCategoryUrl } from "@/lib/forum/constants";
import { cn } from "@/lib/utils";

const buttonClass =
  "inline-flex h-8 items-center rounded-xl border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

export function ThreadModeration({
  threadId,
  categorySlug,
  isPinned,
  isLocked,
}: {
  threadId: string;
  categorySlug: string;
  isPinned: boolean;
  isLocked: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    changes: { isPinned?: boolean; isLocked?: boolean; removed?: boolean },
    onDone?: () => void,
  ) {
    startTransition(async () => {
      const result = await moderateThread(threadId, changes);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (onDone) onDone();
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run({ isPinned: !isPinned })}
        className={cn(
          buttonClass,
          isPinned
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-surface text-muted hover:text-accent",
        )}
      >
        {isPinned ? "Unpin" : "Pin"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => run({ isLocked: !isLocked })}
        className={cn(
          buttonClass,
          isLocked
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-surface text-muted hover:text-accent",
        )}
      >
        {isLocked ? "Unlock" : "Lock"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Remove this thread from the board?")) return;
          run({ removed: true }, () =>
            router.push(forumCategoryUrl(categorySlug)),
          );
        }}
        className={cn(
          buttonClass,
          "border-border bg-surface text-muted hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400",
        )}
      >
        Remove
      </button>
    </div>
  );
}
