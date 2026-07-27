"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deletePost,
  moderatePost,
  updatePost,
} from "@/app/(originals)/originals/forum/actions";
import { ForumAvatar } from "@/components/forum/forum-avatar";
import { ReactionBar } from "@/components/forum/reaction-bar";
import {
  forumCategoryUrl,
  forumProfileUrl,
  MAX_POST_LENGTH,
} from "@/lib/forum/constants";
import type { ForumPost } from "@/lib/forum/types";
import { formatRelativeDate } from "@/lib/utils";

const actionClass =
  "rounded-lg px-1.5 py-0.5 text-xs font-medium text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50";

type ConfirmKind = "delete" | "remove" | null;

export function ForumPostItem({
  post,
  categorySlug,
  canReact,
  isMasterAdmin,
}: {
  post: ForumPost;
  categorySlug: string;
  canReact: boolean;
  isMasterAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [confirming, setConfirming] = useState<ConfirmKind>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updatePost(post.id, draft);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirming(null);
      if (post.isOpeningPost) {
        router.push(forumCategoryUrl(categorySlug));
        return;
      }
      router.refresh();
    });
  }

  function handleConfirmRemove() {
    startTransition(async () => {
      const result = await moderatePost(post.id, true);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirming(null);
      router.refresh();
    });
  }

  const edited = post.updatedAt !== post.createdAt;
  const confirmTitle =
    confirming === "remove"
      ? "Remove this post from the board?"
      : post.isOpeningPost
        ? "Delete this thread?"
        : "Delete this post?";
  const confirmBody =
    confirming === "remove"
      ? "Readers will no longer see this post. You can restore it later from moderation if needed."
      : post.isOpeningPost
        ? "This is the opening post, so the whole thread will be removed."
        : "This action cannot be undone.";

  return (
    <article
      id={`post-${post.id}`}
      className="flex gap-3 px-4 py-4 scroll-mt-24 sm:gap-4 sm:px-5"
    >
      <ForumAvatar author={post.author} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={forumProfileUrl(post.author.username)}
            className="text-sm font-semibold text-foreground transition-colors hover:text-accent"
          >
            {post.author.username}
          </Link>
          <span className="text-xs text-muted">
            {formatRelativeDate(post.createdAt)}
            {edited ? " · edited" : ""}
          </span>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="mt-2">
            <label htmlFor={`edit-${post.id}`} className="sr-only">
              Edit post
            </label>
            <textarea
              id={`edit-${post.id}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
              maxLength={MAX_POST_LENGTH}
              disabled={pending}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                className="inline-flex h-8 items-center rounded-xl bg-accent px-3 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setDraft(post.body);
                  setEditing(false);
                }}
                className="inline-flex h-8 items-center rounded-xl px-3 text-xs font-medium text-muted transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {post.body}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ReactionBar
            postId={post.id}
            reactions={post.reactions}
            canReact={canReact}
          />

          {post.isOwn && !editing && confirming === null ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={pending}
                className={actionClass}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirming("delete")}
                disabled={pending}
                className={actionClass}
              >
                Delete
              </button>
            </>
          ) : null}

          {isMasterAdmin && !post.isOwn && confirming === null ? (
            <button
              type="button"
              onClick={() => setConfirming("remove")}
              disabled={pending}
              className={actionClass}
            >
              Remove
            </button>
          ) : null}
        </div>

        {confirming ? (
          <div
            role="dialog"
            aria-modal="false"
            aria-labelledby={`delete-post-${post.id}`}
            className="mt-3 rounded-xl border border-border bg-background p-3 shadow-sm"
          >
            <p
              id={`delete-post-${post.id}`}
              className="text-sm font-semibold text-foreground"
            >
              {confirmTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {confirmBody}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  confirming === "remove"
                    ? handleConfirmRemove
                    : handleConfirmDelete
                }
                disabled={pending}
                className="inline-flex h-8 items-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {pending
                  ? confirming === "remove"
                    ? "Removing…"
                    : "Deleting…"
                  : confirming === "remove"
                    ? "Remove"
                    : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={pending}
                className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-accent/40 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
