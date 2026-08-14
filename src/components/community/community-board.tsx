"use client";

import Link from "next/link";
import {
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowRight, ChevronDown, LogIn, Trash2 } from "lucide-react";

import {
  createCommunityPost,
  deleteCommunityPost,
} from "@/app/(main)/community/actions";
import { CommunityVoteButton } from "@/components/community/community-vote-button";
import { TabPanelShell } from "@/components/tab-panel-shell";
import { Badge } from "@/components/ui/badge";
import { useStoredOpen } from "@/hooks/use-stored-open";
import {
  COMMUNITY_BODY_MAX,
  COMMUNITY_TITLE_MAX,
} from "@/lib/community-constants";
import { loginHref } from "@/lib/safe-return-path";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { CommunityPost, CommunityPostKind } from "@/types";

const KIND_COPY: Record<
  CommunityPostKind,
  { label: string; titleLabel: string; titlePlaceholder: string; bodyPlaceholder: string; submit: string }
> = {
  novel_request: {
    label: "Request",
    titleLabel: "Novel title",
    titlePlaceholder: "e.g. Reverend Insanity",
    bodyPlaceholder: "Optional: source language, NovelUpdates link, why you want it…",
    submit: "Request",
  },
  idea: {
    label: "Idea",
    titleLabel: "Idea",
    titlePlaceholder: "e.g. Reading history on the home page",
    bodyPlaceholder: "Optional: a bit more detail…",
    submit: "Post idea",
  },
};

const STATUS_LABEL: Record<CommunityPost["status"], string> = {
  open: "Open",
  planned: "Planned",
  done: "Done",
  declined: "Declined",
};

function statusClass(status: CommunityPost["status"]) {
  if (status === "planned") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
  if (status === "done") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "declined") {
    return "border-border bg-surface text-muted";
  }
  return "";
}

function sortPosts(posts: CommunityPost[], sort: "top" | "new") {
  return [...posts].sort((a, b) => {
    if (sort === "new") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function CommunitySubmitForm({
  isLoggedIn,
  returnPath,
  onCreated,
}: {
  isLoggedIn: boolean;
  returnPath: string;
  onCreated: (post: CommunityPost) => void;
}) {
  const [kind, setKind] = useState<CommunityPostKind>("novel_request");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = KIND_COPY[kind];

  if (!isLoggedIn) {
    return (
      <Link
        href={loginHref(returnPath)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <LogIn className="size-3.5" strokeWidth={1.75} aria-hidden />
        Sign in to post
      </Link>
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCommunityPost(kind, title, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.post) {
        onCreated(result.post);
        setTitle("");
        setBody("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div
        className="flex gap-1 rounded-lg border border-border bg-background p-1"
        role="group"
        aria-label="Post type"
      >
        {(
          [
            ["novel_request", "Novel request"],
            ["idea", "Idea"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            className={cn(
              "h-8 flex-1 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              kind === value
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <label htmlFor="community-title" className="sr-only">
        {copy.titleLabel}
      </label>
      <input
        id="community-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={copy.titlePlaceholder}
        maxLength={COMMUNITY_TITLE_MAX}
        required
        disabled={pending}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50"
      />
      <label htmlFor="community-body" className="sr-only">
        Details
      </label>
      <textarea
        id="community-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={copy.bodyPlaceholder}
        rows={2}
        maxLength={COMMUNITY_BODY_MAX}
        disabled={pending}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50"
      />
      <div className="flex items-center justify-between gap-2">
        {error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Posting…" : copy.submit}
        </button>
      </div>
    </form>
  );
}

function CommunityPostCard({
  post,
  isLoggedIn,
  compact,
  returnPath,
  onDeleted,
}: {
  post: CommunityPost;
  isLoggedIn: boolean;
  compact: boolean;
  returnPath: string;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const statusLabel =
    post.kind === "novel_request" && post.status === "done"
      ? "Added"
      : STATUS_LABEL[post.status];

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCommunityPost(post.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted(post.id);
    });
  }

  return (
    <article className="flex gap-3">
      <CommunityVoteButton
        postId={post.id}
        initialVoted={post.votedByCurrentUser}
        initialCount={post.voteCount}
        isLoggedIn={isLoggedIn}
        returnPath={returnPath}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 break-words text-sm font-semibold leading-snug text-foreground">
            {post.title}
          </h3>
          {post.status !== "open" ? (
            <Badge className={cn("shrink-0", statusClass(post.status))}>
              {statusLabel}
            </Badge>
          ) : null}
        </div>
        {post.body ? (
          <p
            className={cn(
              "mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted",
              compact && "line-clamp-2",
            )}
          >
            {post.body}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{KIND_COPY[post.kind].label}</span>
          <span aria-hidden>·</span>
          {post.username === "Unknown" ? (
            <span className="font-medium text-foreground/80">{post.username}</span>
          ) : (
            <Link
              href={`/u/${post.username}`}
              className="font-medium text-foreground/80 transition-colors hover:text-accent"
            >
              {post.username}
            </Link>
          )}
          <span aria-hidden>·</span>
          <time dateTime={post.createdAt}>{formatRelativeDate(post.createdAt)}</time>
          {post.isOwn ? (
            confirming ? (
              <>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="font-semibold text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                >
                  {pending ? "Deleting…" : "Confirm delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="hover:underline"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Trash2 className="size-3" strokeWidth={1.75} aria-hidden />
                  Delete
                </button>
              </>
            )
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function CommunityColumn({
  posts,
  isLoggedIn,
  compact,
  returnPath,
  leftTab,
  rightTab,
}: {
  posts: CommunityPost[];
  isLoggedIn: boolean;
  compact: boolean;
  returnPath: string;
  leftTab?: ReactNode;
  rightTab?: ReactNode;
}) {
  const [items, setItems] = useState(posts);
  const [sort, setSort] = useState<"top" | "new">("top");
  const sorted = useMemo(() => sortPosts(items, sort), [items, sort]);
  const visible = compact ? sorted.slice(0, 5) : sorted;
  const shelled = Boolean(leftTab || rightTab);

  const body = (
    <>
      {!compact ? (
        <CommunitySubmitForm
          isLoggedIn={isLoggedIn}
          returnPath={returnPath}
          onCreated={(post) => setItems((current) => [post, ...current])}
        />
      ) : null}

      {!compact && items.length > 1 ? (
        <div className="mt-4 flex gap-1" role="group" aria-label="Sort posts">
          {(["top", "new"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              aria-pressed={sort === value}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                sort === value
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground",
              )}
            >
              {value === "top" ? "Top" : "Newest"}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length > 0 ? (
        <ul className={cn("flex flex-col gap-4", !compact && "mt-5")}>
          {visible.map((post) => (
            <li key={post.id}>
              <CommunityPostCard
                post={post}
                isLoggedIn={isLoggedIn}
                compact={compact}
                returnPath={returnPath}
                onDeleted={(id) =>
                  setItems((current) => current.filter((item) => item.id !== id))
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn(
            "rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted",
            !compact && "mt-4",
          )}
        >
          Ideas & Novel Requests
        </p>
      )}
    </>
  );

  if (shelled) {
    return (
      <TabPanelShell leftTab={leftTab} rightTab={rightTab} className="min-w-0">
        <div className="min-w-0 overflow-hidden p-4 sm:p-5">{body}</div>
      </TabPanelShell>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-4 sm:p-5">
      {body}
    </div>
  );
}

export function CommunityHomePreview({
  posts,
  isLoggedIn,
}: {
  posts: CommunityPost[];
  isLoggedIn: boolean;
}) {
  const { open, toggle } = useStoredOpen("cf-home-section-community", true);
  const panelId = useId();

  const communityTab = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={toggle}
      className="inline-flex h-9 items-center gap-1.5 px-4 text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <h2>Community</h2>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted transition-transform",
          open && "rotate-180",
        )}
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );

  const openBoard = (
    <Link
      href="/community"
      className="inline-flex h-9 items-center gap-1.5 pl-4 pr-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Open board
      <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
    </Link>
  );

  if (!open) {
    return (
      <TabPanelShell leftTab={communityTab} rightTab={openBoard}>
        <div id={panelId} hidden />
      </TabPanelShell>
    );
  }

  return (
    <div id={panelId}>
      <CommunityColumn
        posts={posts}
        isLoggedIn={isLoggedIn}
        compact
        returnPath="/#community"
        leftTab={communityTab}
        rightTab={openBoard}
      />
    </div>
  );
}

export function CommunityPageBoard({
  posts,
  isLoggedIn,
}: {
  posts: CommunityPost[];
  isLoggedIn: boolean;
}) {
  return (
    <>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        Request a novel or share an idea. Vote to help us decide what to work on
        next.
      </p>
      <CommunityColumn
        posts={posts}
        isLoggedIn={isLoggedIn}
        compact={false}
        returnPath="/community"
      />
    </>
  );
}
