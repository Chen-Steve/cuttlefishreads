"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteCommunityPostAsAdmin,
  updateCommunityPostStatus,
} from "../actions";
import type { CommunityPostStatus } from "@/types";

const STATUSES: { value: CommunityPostStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "planned", label: "Planned" },
  { value: "done", label: "Done" },
  { value: "declined", label: "Declined" },
];

export function CommunityModerationControls({
  postId,
  status,
}: {
  postId: string;
  status: CommunityPostStatus;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleStatus(next: string) {
    if (next === status) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCommunityPostStatus(postId, next);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCommunityPostAsAdmin(postId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="sr-only" htmlFor={`community-status-${postId}`}>
          Status
        </label>
        <select
          id={`community-status-${postId}`}
          defaultValue={status}
          disabled={pending}
          onChange={(event) => handleStatus(event.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="h-9 rounded-lg border border-border px-3 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="h-9 rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-red-500 hover:text-red-600"
          >
            Delete
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
