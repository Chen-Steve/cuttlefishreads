"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setReaction } from "@/app/(originals)/originals/forum/actions";
import {
  FORUM_REACTIONS,
  type ForumReactionKey,
} from "@/lib/forum/constants";
import type { ForumReactionSummary } from "@/lib/forum/types";
import { cn } from "@/lib/utils";

function applyChoice(
  summaries: ForumReactionSummary[],
  key: ForumReactionKey,
): ForumReactionSummary[] {
  const next = summaries.map((summary) => ({ ...summary }));
  const current = next.find((summary) => summary.reactedByCurrentUser);

  if (current) {
    current.count -= 1;
    current.reactedByCurrentUser = false;
  }

  // Picking the reaction you already had clears it instead of re-adding.
  if (current?.key !== key) {
    const target = next.find((summary) => summary.key === key);
    if (target) {
      target.count += 1;
      target.reactedByCurrentUser = true;
    } else {
      next.push({ key, count: 1, reactedByCurrentUser: true });
    }
  }

  return next.filter((summary) => summary.count > 0);
}

export function ReactionBar({
  postId,
  reactions,
  canReact,
}: {
  postId: string;
  reactions: ForumReactionSummary[];
  canReact: boolean;
}) {
  const router = useRouter();
  const [serverReactions, setServerReactions] = useState(reactions);
  const [shown, setShown] = useState(reactions);
  const [, startTransition] = useTransition();

  // Re-sync once the server sends a fresh count after a refresh.
  if (serverReactions !== reactions) {
    setServerReactions(reactions);
    setShown(reactions);
  }

  function handleReact(key: ForumReactionKey) {
    const optimistic = applyChoice(shown, key);
    setShown(optimistic);

    startTransition(async () => {
      const result = await setReaction(postId, key);
      if (result.error) {
        setShown(shown);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FORUM_REACTIONS.map((reaction) => {
        const summary = shown.find((item) => item.key === reaction.key);
        const count = summary?.count ?? 0;
        const active = Boolean(summary?.reactedByCurrentUser);

        // Guests see the tally that exists, not an empty set of buttons they
        // cannot press.
        if (!canReact && count === 0) return null;

        return (
          <button
            key={reaction.key}
            type="button"
            disabled={!canReact}
            onClick={() => handleReact(reaction.key)}
            aria-pressed={active}
            aria-label={`${reaction.label}${count > 0 ? ` (${count})` : ""}`}
            title={reaction.label}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-background text-muted",
              canReact && !active && "hover:border-accent/40 hover:text-accent",
              !canReact && "cursor-default",
            )}
          >
            <span aria-hidden>{reaction.symbol}</span>
            {count > 0 ? (
              <span className="tabular-nums">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
