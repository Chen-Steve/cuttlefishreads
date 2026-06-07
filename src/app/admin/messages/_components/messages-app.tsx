"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowLeft,
  Hash,
  Heart,
  Loader2,
  MessageSquarePlus,
  Plus,
  Send,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import type { ChatChannel, ChatMember, ChatMessage } from "@/lib/messaging";
import {
  createChannel,
  fetchMessages,
  listConversationsAction,
  sendMessage,
  startDirectMessage,
  toggleMessageLike,
} from "../actions";

const CHANNEL_POLL_MS = 15000;
const MAX_MESSAGE_LENGTH = 4000;

function dedupeById(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MessagesApp({
  currentUserId,
  isMasterAdmin,
  members,
  initialChannels,
  initialActiveChannelId,
  initialMessages,
}: {
  currentUserId: string;
  isMasterAdmin: boolean;
  members: ChatMember[];
  initialChannels: ChatChannel[];
  initialActiveChannelId: string | null;
  initialMessages: ChatMessage[];
}) {
  const [channels, setChannels] = useState<ChatChannel[]>(initialChannels);
  const [activeId, setActiveId] = useState<string | null>(
    initialActiveChannelId,
  );
  const [messagesByChannel, setMessagesByChannel] = useState<
    Record<string, ChatMessage[]>
  >(initialActiveChannelId ? { [initialActiveChannelId]: initialMessages } : {});
  const [loadingChannel, setLoadingChannel] = useState(false);
  // Mobile: when a conversation is open, show the thread instead of the list.
  const [mobileView, setMobileView] = useState<"list" | "thread">(
    initialActiveChannelId ? "thread" : "list",
  );

  const activeChannel = channels.find((c) => c.id === activeId) ?? null;
  const activeMessages = activeId ? (messagesByChannel[activeId] ?? []) : [];

  const membersById = useMemo(
    () => new Map(members.map((m) => [m.id, m.username])),
    [members],
  );

  const setChannelMessages = useCallback(
    (channelId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesByChannel((prev) => ({
        ...prev,
        [channelId]: dedupeById(updater(prev[channelId] ?? [])),
      }));
    },
    [],
  );

  // Load a conversation's history when it's selected for the first time.
  const openChannel = useCallback(
    async (channelId: string) => {
      setActiveId(channelId);
      setMobileView("thread");
      if (messagesByChannel[channelId]) return;
      setLoadingChannel(true);
      const result = await fetchMessages(channelId);
      setLoadingChannel(false);
      if (result.messages) {
        setChannelMessages(channelId, () => result.messages!);
      }
    },
    [messagesByChannel, setChannelMessages],
  );

  // Subscribe to the active conversation's private Realtime topic for live
  // messages and likes (broadcast from the database). Replaces polling.
  useEffect(() => {
    if (!activeId) return;
    const channelId = activeId;
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      // Authorize the WebSocket with the current session so private topics work.
      await supabase.realtime.setAuth();
      if (!active) return;

      channel = supabase
        .channel(`chat:${channelId}`, { config: { private: true } })
        .on("broadcast", { event: "INSERT" }, ({ payload }) => {
          const d = payload as {
            id?: string;
            channel_id?: string;
            user_id?: string;
            body?: string;
            created_at?: string;
            updated_at?: string;
          };
          if (!d?.id || !d.channel_id || !d.user_id) return;
          const isOwn = d.user_id === currentUserId;
          const message: ChatMessage = {
            id: d.id,
            channelId: d.channel_id,
            userId: d.user_id,
            username: isOwn ? "You" : (membersById.get(d.user_id) ?? "Unknown"),
            body: d.body ?? "",
            likeCount: 0,
            likedByCurrentUser: false,
            isOwn,
            createdAt: d.created_at ?? new Date().toISOString(),
            updatedAt: d.updated_at ?? d.created_at ?? new Date().toISOString(),
          };
          // dedupeById drops our own optimistic echo (same id).
          setChannelMessages(d.channel_id, (prev) => [...prev, message]);
        })
        .on("broadcast", { event: "like" }, ({ payload }) => {
          const d = payload as {
            messageId?: string;
            userId?: string;
            op?: "insert" | "delete";
          };
          if (!d?.messageId) return;
          // Our own likes are already applied optimistically.
          if (d.userId === currentUserId) return;
          const liked = d.op === "insert";
          setChannelMessages(channelId, (prev) =>
            prev.map((m) =>
              m.id === d.messageId
                ? {
                    ...m,
                    likeCount: Math.max(0, m.likeCount + (liked ? 1 : -1)),
                  }
                : m,
            ),
          );
        })
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [activeId, currentUserId, membersById, setChannelMessages]);

  // Periodically refresh the conversation list so DMs started by others appear.
  useEffect(() => {
    const id = setInterval(async () => {
      const result = await listConversationsAction();
      if (result.channels) setChannels(result.channels);
    }, CHANNEL_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const handleChannelCreated = useCallback((channel: ChatChannel) => {
    setChannels((prev) =>
      prev.some((c) => c.id === channel.id) ? prev : [...prev, channel],
    );
    setActiveId(channel.id);
    setMobileView("thread");
  }, []);

  const handleDmStarted = useCallback(
    (channel: ChatChannel) => {
      setChannels((prev) =>
        prev.some((c) => c.id === channel.id) ? prev : [...prev, channel],
      );
      void openChannel(channel.id);
    },
    [openChannel],
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-3rem)] w-full max-w-6xl gap-0 px-0 sm:h-[calc(100dvh-3.25rem)] sm:px-6 sm:py-6 lg:px-8">
      <div className="flex w-full overflow-hidden rounded-none border-border bg-surface sm:rounded-2xl sm:border">
        <Sidebar
          channels={channels}
          members={members}
          activeId={activeId}
          isMasterAdmin={isMasterAdmin}
          mobileHidden={mobileView === "thread"}
          onSelect={openChannel}
          onChannelCreated={handleChannelCreated}
          onDmStarted={handleDmStarted}
        />

        <Thread
          channel={activeChannel}
          messages={activeMessages}
          currentUserId={currentUserId}
          loading={loadingChannel}
          mobileHidden={mobileView === "list"}
          onBack={() => setMobileView("list")}
          onSend={(message) =>
            setChannelMessages(message.channelId, (prev) => [...prev, message])
          }
          onLikeChange={(messageId, liked) =>
            activeId &&
            setChannelMessages(activeId, (prev) =>
              prev.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      likedByCurrentUser: liked,
                      likeCount: Math.max(0, m.likeCount + (liked ? 1 : -1)),
                    }
                  : m,
              ),
            )
          }
        />
      </div>
    </div>
  );
}

function Sidebar({
  channels,
  members,
  activeId,
  isMasterAdmin,
  mobileHidden,
  onSelect,
  onChannelCreated,
  onDmStarted,
}: {
  channels: ChatChannel[];
  members: ChatMember[];
  activeId: string | null;
  isMasterAdmin: boolean;
  mobileHidden: boolean;
  onSelect: (channelId: string) => void;
  onChannelCreated: (channel: ChatChannel) => void;
  onDmStarted: (channel: ChatChannel) => void;
}) {
  const groupChannels = channels.filter((c) => c.kind === "channel");
  const dmChannels = channels.filter((c) => c.kind === "dm");

  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  return (
    <aside
      className={cn(
        "w-full shrink-0 flex-col overflow-y-auto border-border bg-background/40 sm:flex sm:w-64 sm:border-r",
        mobileHidden ? "hidden sm:flex" : "flex",
      )}
    >
      {/* Mobile-only header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:hidden">
        <span className="text-sm font-semibold text-foreground">Messages</span>
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Channels
        </h2>
        {isMasterAdmin ? (
          <button
            type="button"
            onClick={() => setShowNewChannel((v) => !v)}
            aria-label="Create channel"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-1"
          >
            <Plus className="size-5 sm:size-4" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>

      {showNewChannel ? (
        <NewChannelForm
          onClose={() => setShowNewChannel(false)}
          onCreated={(channel) => {
            setShowNewChannel(false);
            onChannelCreated(channel);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-0.5 px-2">
        {groupChannels.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted">No channels yet.</p>
        ) : (
          groupChannels.map((c) => (
            <ConversationButton
              key={c.id}
              active={c.id === activeId}
              onClick={() => onSelect(c.id)}
              icon={<Hash className="size-4 shrink-0" strokeWidth={2} aria-hidden />}
              label={c.name ?? "channel"}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between px-4 pb-2 pt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Direct messages
        </h2>
        <button
          type="button"
          onClick={() => setShowMembers((v) => !v)}
          aria-label="New direct message"
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-1"
        >
          <MessageSquarePlus className="size-5 sm:size-4" strokeWidth={2} aria-hidden />
        </button>
      </div>

      {showMembers ? (
        <MemberPicker
          members={members}
          onClose={() => setShowMembers(false)}
          onStarted={(channel) => {
            setShowMembers(false);
            onDmStarted(channel);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-0.5 px-2 pb-4">
        {dmChannels.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted">No conversations yet.</p>
        ) : (
          dmChannels.map((c) => (
            <ConversationButton
              key={c.id}
              active={c.id === activeId}
              onClick={() => onSelect(c.id)}
              icon={<Avatar name={c.title} />}
              label={c.title}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ConversationButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors sm:gap-2 sm:px-2 sm:py-1.5",
        active
          ? "bg-accent/10 text-accent"
          : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
      {initial}
    </span>
  );
}

function NewChannelForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (channel: ChatChannel) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createChannel(name);
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      if (result.channel) onCreated(result.channel);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-1 px-3 pb-1">
      <div className="flex items-center gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="channel-name"
          autoFocus
          maxLength={40}
          disabled={pending}
          className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex h-8 items-center rounded-lg bg-accent px-2.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Add"}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="rounded-lg p-1 text-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function MemberPicker({
  members,
  onClose,
  onStarted,
}: {
  members: ChatMember[];
  onClose: () => void;
  onStarted: (channel: ChatChannel) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const others = useMemo(() => members.filter((m) => !m.isSelf), [members]);

  function start(memberId: string) {
    setError(null);
    setPendingId(memberId);
    startDirectMessage(memberId).then((result) => {
      setPendingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.channel) onStarted(result.channel);
    });
  }

  return (
    <div className="mb-1 px-3 pb-1">
      <div className="flex items-center justify-between pb-1">
        <span className="text-[11px] font-medium text-muted">
          Start a conversation
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="rounded-lg p-1 text-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {others.length === 0 ? (
        <p className="px-1 py-1 text-xs text-muted">No one else here yet.</p>
      ) : (
        <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-background p-1">
          {others.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={pendingId !== null}
              onClick={() => start(m.id)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-50"
            >
              <Avatar name={m.username} />
              <span className="truncate">{m.username}</span>
              {m.role === "admin" ? (
                <span className="ml-auto rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                  Admin
                </span>
              ) : null}
              {pendingId === m.id ? (
                <Loader2 className="ml-auto size-3.5 animate-spin text-muted" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Thread({
  channel,
  messages,
  currentUserId,
  loading,
  mobileHidden,
  onBack,
  onSend,
  onLikeChange,
}: {
  channel: ChatChannel | null;
  messages: ChatMessage[];
  currentUserId: string;
  loading: boolean;
  mobileHidden: boolean;
  onBack: () => void;
  onSend: (message: ChatMessage) => void;
  onLikeChange: (messageId: string, liked: boolean) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message when the count changes and the user is
  // already near the bottom.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      160;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length, channel?.id]);

  if (!channel) {
    return (
      <section
        className={cn(
          "flex-1 items-center justify-center p-8 text-center",
          mobileHidden ? "hidden sm:flex" : "flex",
        )}
      >
        <p className="text-sm text-muted">
          Select a channel or conversation to start chatting.
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "min-w-0 flex-1 flex-col",
        mobileHidden ? "hidden sm:flex" : "flex",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="-ml-1 rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground sm:hidden"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        {channel.kind === "channel" ? (
          <Hash className="size-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
        ) : (
          <Avatar name={channel.title} />
        )}
        <h1 className="truncate text-sm font-semibold text-foreground">
          {channel.kind === "channel" ? channel.name : channel.title}
        </h1>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted" aria-hidden />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            onLikeChange={onLikeChange}
          />
        )}
        <div ref={bottomRef} />
      </div>

      <Composer key={channel.id} channelId={channel.id} onSend={onSend} />
    </section>
  );
}

function MessageList({
  messages,
  currentUserId,
  onLikeChange,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  onLikeChange: (messageId: string, liked: boolean) => void;
}) {
  return (
    <>
      {messages.map((m, i) => {
        const prev = i > 0 ? messages[i - 1] : null;
        const day = formatDayLabel(m.createdAt);
        const showDay = !prev || day !== formatDayLabel(prev.createdAt);
        const time = new Date(m.createdAt).getTime();
        // Group consecutive messages from the same person within 5 minutes.
        const grouped =
          !showDay &&
          !!prev &&
          m.userId === prev.userId &&
          time - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;

        return (
          <div key={m.id}>
            {showDay ? (
              <div className="my-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium text-muted">{day}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            <MessageBubble
              message={m}
              grouped={grouped}
              currentUserId={currentUserId}
              onLikeChange={onLikeChange}
            />
          </div>
        );
      })}
    </>
  );
}

function MessageBubble({
  message,
  grouped,
  currentUserId,
  onLikeChange,
}: {
  message: ChatMessage;
  grouped: boolean;
  currentUserId: string;
  onLikeChange: (messageId: string, liked: boolean) => void;
}) {
  const isOwn = message.userId === currentUserId;

  return (
    <div className={cn("group flex flex-col", grouped ? "mt-0.5" : "mt-3")}>
      {!grouped ? (
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">
            {isOwn ? "You" : message.username}
          </span>
          <span className="text-[11px] text-muted">
            {formatTime(message.createdAt)}
          </span>
        </div>
      ) : null}
      <div className="flex items-start gap-2">
        <p className="mt-0.5 min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          {message.body}
        </p>
        <MessageLikeButton
          message={message}
          onLikeChange={onLikeChange}
        />
      </div>
    </div>
  );
}

function MessageLikeButton({
  message,
  onLikeChange,
}: {
  message: ChatMessage;
  onLikeChange: (messageId: string, liked: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const nextLiked = !message.likedByCurrentUser;
    onLikeChange(message.id, nextLiked);
    startTransition(async () => {
      const result = await toggleMessageLike(message.id);
      if (result.error) {
        // Revert on failure.
        onLikeChange(message.id, !nextLiked);
      } else if (typeof result.liked === "boolean" && result.liked !== nextLiked) {
        onLikeChange(message.id, result.liked);
      }
    });
  }

  const liked = message.likedByCurrentUser;
  const count = message.likeCount;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike message" : "Like message"}
      className={cn(
        "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50",
        liked
          ? "text-accent"
          : "text-muted opacity-0 hover:bg-surface hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100",
        count > 0 && "opacity-100",
      )}
    >
      <Heart
        className="size-3.5"
        strokeWidth={1.75}
        fill={liked ? "currentColor" : "none"}
        aria-hidden
      />
      {count > 0 ? count : null}
    </button>
  );
}

function Composer({
  channelId,
  onSend,
}: {
  channelId: string;
  onSend: (message: ChatMessage) => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessage(channelId, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      if (result.message) onSend(result.message);
      textareaRef.current?.focus();
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-border p-2.5 sm:p-3">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Write a message…"
          className="max-h-32 min-h-[1.5rem] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          aria-label="Send message"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
