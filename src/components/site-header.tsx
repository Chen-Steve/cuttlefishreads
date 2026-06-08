"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, Cookie, LogIn, LogOut, Library, PenLine, Search, Settings, ShoppingBag, User, X } from "lucide-react";

import { signOut } from "@/app/(main)/(auth)/actions";
import { cn } from "@/lib/utils";

type SearchMatch = {
  slug: string;
  title: string;
  coverUrl?: string;
};

const baseNavItems = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/novels", label: "Novels", icon: BookOpen },
] as const;

function HeaderSearch({
  inputRef,
  onMatchClick,
  className,
  labelClassName,
  inputClassName,
  iconClassName,
}: {
  inputRef?: React.Ref<HTMLInputElement>;
  onMatchClick?: () => void;
  className?: string;
  labelClassName: string;
  inputClassName: string;
  iconClassName: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestion, setSuggestion] = useState<{
    query: string;
    match: SearchMatch | null;
  } | null>(null);
  const [focused, setFocused] = useState(false);
  const trimmedQuery = query.trim();
  const match =
    suggestion?.query === trimmedQuery ? suggestion.match : null;
  const showMatch = focused && trimmedQuery.length > 0 && match;

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search-suggestions?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;

        const data = (await response.json()) as { match?: SearchMatch | null };
        setSuggestion({ query: trimmedQuery, match: data.match ?? null });
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          setSuggestion({ query: trimmedQuery, match: null });
        }
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  return (
    <form className={cn("relative", className)} role="search" action="/search">
      <label className={labelClassName}>
        <Search
          className={iconClassName}
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 100)}
          placeholder="Search by title..."
          className={inputClassName}
          aria-label="Search"
          autoComplete="off"
        />
      </label>

      {showMatch ? (
        <Link
          href={`/novels/${match.slug}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onMatchClick}
          className="absolute top-full right-0 left-0 z-30 mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 text-left shadow-md transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-background">
            {match.coverUrl ? (
              <Image
                src={match.coverUrl}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {match.title}
            </span>
            <span className="block text-xs text-muted">Closest title match</span>
          </span>
        </Link>
      ) : null}
    </form>
  );
}

function AccountDropdown({
  username,
  coins = 0,
  isAdmin = false,
  isMasterAdmin = false,
}: {
  username?: string | null;
  coins?: number;
  isAdmin?: boolean;
  isMasterAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium leading-none text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-9 sm:px-3"
      >
        <User className="size-5 shrink-0 sm:size-4" strokeWidth={1.75} aria-hidden />
        <span className="hidden max-w-32 truncate lg:inline">
          {username || "Account"}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-150 sm:size-3.5", open && "rotate-180")}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 min-w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-md"
        >
          <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
            <Cookie className="size-4 shrink-0 text-amber-500" strokeWidth={1.75} aria-hidden />
            <span className="text-sm font-semibold text-foreground">
              {coins.toLocaleString()}
            </span>
            <span className="text-sm text-muted">cookies</span>
          </div>

          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <User className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
            Account
          </Link>

          {username ? (
            <Link
              href={`/u/${username}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              <Library className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
              Public profile
            </Link>
          ) : null}

          <Link
            href="/shop"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <ShoppingBag className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
            Shop
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              {isMasterAdmin ? (
                <Settings className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
              ) : (
                <PenLine className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
              )}
              {isMasterAdmin ? "Admin" : "Workspace"}
            </Link>
          )}

          <div className="mx-2 border-t border-border" />

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              <LogOut className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function SiteHeader({
  isAuthenticated = false,
  username = null,
  coins = 0,
  isAdmin = false,
  isMasterAdmin = false,
}: {
  isAuthenticated?: boolean;
  username?: string | null;
  coins?: number;
  isAdmin?: boolean;
  isMasterAdmin?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      mobileInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  const navItems = isAuthenticated
    ? baseNavItems
    : [...baseNavItems, { href: "/login", label: "Login / Sign Up", icon: LogIn }];

  return (
    <header className="border-b border-border bg-background">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Cuttlefish Reads home"
          className="relative z-10 inline-flex h-9 shrink-0 items-center overflow-visible rounded-lg outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="relative flex h-9 w-12 shrink-0 items-center overflow-visible">
            <Image
              src="/cuttle.png"
              alt=""
              width={24}
              height={24}
              className="pointer-events-none absolute top-1/2 left-0 h-32 w-auto -translate-y-1/2 object-contain"
              priority
              aria-hidden
            />
          </span>
          <span className="ml-2 hidden items-center sm:flex">
            <span className="text-lg font-semibold leading-none tracking-tight text-foreground md:text-xl">
              Cuttlefish Reads
            </span>
          </span>
        </Link>

        {/* Full search bar — shown from sm up */}
        <HeaderSearch
          className="mx-auto hidden w-full max-w-md flex-1 sm:block"
          labelClassName="flex h-9 w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface py-0 pr-4 pl-3.5 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25"
          inputClassName="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium leading-none text-foreground outline-none placeholder:font-medium placeholder:leading-none placeholder:text-muted/80"
          iconClassName="size-4 shrink-0 text-muted"
        />

        {/* Spacer pushes nav to the right on mobile (where the inline form is hidden) */}
        <div className="flex-1 sm:hidden" />

        <nav
          className="flex shrink-0 items-center gap-0.5 sm:gap-1"
          aria-label="Main"
        >
          {/* Search toggle — mobile only */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            aria-expanded={searchOpen}
            className="inline-flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden"
          >
            <Search className="size-5" strokeWidth={1.75} aria-hidden />
          </button>

          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium leading-none text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-9 sm:px-3"
            >
              <span className="flex size-5 shrink-0 items-center justify-center sm:size-4">
                <Icon className="size-5 sm:size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}

          {isAuthenticated ? (
            <AccountDropdown
              username={username}
              coins={coins}
              isAdmin={isAdmin}
              isMasterAdmin={isMasterAdmin}
            />
          ) : null}
        </nav>

        {/* Expanded mobile search — overlays the bar when open */}
        <div
          className={cn(
            "absolute inset-x-2 z-20 items-center gap-2 bg-background sm:!hidden",
            searchOpen ? "flex" : "hidden",
          )}
        >
          <HeaderSearch
            inputRef={mobileInputRef}
            onMatchClick={() => setSearchOpen(false)}
            className="min-w-0 flex-1"
            labelClassName="flex h-10 w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface py-0 pr-3 pl-3.5 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25"
            inputClassName="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium leading-none text-foreground outline-none placeholder:font-medium placeholder:leading-none placeholder:text-muted/80"
            iconClassName="size-5 shrink-0 text-muted"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
