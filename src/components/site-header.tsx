"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, LogIn, Library, PenLine, Search, ShoppingBag } from "lucide-react";

import { AccountDropdown } from "@/components/account-dropdown";
import { useImmersiveHidesSiteHeader } from "@/components/reader";
import { ThemeToggle } from "@/components/theme-toggle";
import { originalsPublicUrl } from "@/lib/hosts";
import { cn } from "@/lib/utils";

type SearchMatch = {
  slug: string;
  title: string;
  coverUrl?: string;
};

const novelsNavItem = { href: "/novels", label: "Novels", icon: BookOpen } as const;
const originalsNavItem = {
  href: originalsPublicUrl(),
  label: "Originals",
  icon: PenLine,
} as const;
const libraryNavItem = { href: "/library", label: "Library", icon: Library } as const;
const shopNavItem = { href: "/shop", label: "Shop", icon: ShoppingBag } as const;
const loginNavItem = { href: "/login", label: "Login / Sign Up", icon: LogIn } as const;
const authenticatedMobileNavItems = [libraryNavItem, shopNavItem] as const;

function getNavItemClassName(href: string, isAuthenticated: boolean) {
  if (href === "/novels" || href === originalsNavItem.href) {
    return cn(navIconLinkBaseClass, "hidden sm:inline-flex");
  }
  if (isAuthenticated && (href === "/library" || href === "/shop")) {
    return cn(navIconLinkBaseClass, "hidden sm:inline-flex");
  }
  return navIconLinkClass;
}

const navIconLinkBaseClass =
  "h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium leading-none text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-9 sm:px-3";

const navIconLinkClass = cn(navIconLinkBaseClass, "inline-flex");

const navIconWrapperClass =
  "flex size-5 shrink-0 items-center justify-center sm:size-4";

function useIsDesktopNav() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

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
          className="absolute top-full right-0 left-0 z-50 mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 text-left shadow-md transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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

export function SiteHeader({
  isAuthenticated = false,
  username = null,
  avatarUrl = null,
  coins = 0,
  isTranslator = false,
  isMasterAdmin = false,
}: {
  isAuthenticated?: boolean;
  username?: string | null;
  avatarUrl?: string | null;
  coins?: number;
  isTranslator?: boolean;
  isMasterAdmin?: boolean;
}) {
  const isDesktop = useIsDesktopNav();
  const hideForImmersive = useImmersiveHidesSiteHeader();

  const navItems = isAuthenticated
    ? [novelsNavItem, originalsNavItem, libraryNavItem, shopNavItem]
    : [novelsNavItem, originalsNavItem, loginNavItem];

  const desktopSearchClassNames = {
    labelClassName:
      "flex h-9 w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface py-0 pr-4 pl-3.5 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25",
    inputClassName:
      "min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium leading-none text-foreground outline-none placeholder:font-medium placeholder:leading-none placeholder:text-muted/80",
    iconClassName: "size-4 shrink-0 text-muted",
  };

  if (hideForImmersive) {
    return null;
  }

  return (
    <header className="overflow-visible border-b border-border bg-background">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 overflow-visible px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Cuttlefish Reads home"
          className="relative z-0 inline-flex h-9 shrink-0 items-center overflow-hidden rounded-lg outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent sm:overflow-visible"
        >
          <span className="relative flex h-9 w-12 shrink-0 items-center overflow-hidden sm:overflow-visible">
            <Image
              src="/cuttle.png"
              alt=""
              width={24}
              height={24}
              className="pointer-events-none absolute top-1/2 left-0 h-9 w-auto -translate-y-1/2 object-contain sm:h-32"
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

        {isDesktop ? (
          <div className="relative z-50 mx-auto min-w-0 w-full max-w-md flex-1">
            <HeaderSearch {...desktopSearchClassNames} />
          </div>
        ) : null}

        <div className="pointer-events-none min-w-0 flex-1 sm:hidden" />

        <nav
          className="flex shrink-0 items-center gap-0.5 sm:gap-1"
          aria-label="Main"
        >
          <Link
            href="/novels"
            aria-label="All novels"
            className={cn(navIconLinkClass, "sm:hidden")}
          >
            <span className={navIconWrapperClass}>
              <BookOpen className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
          </Link>

          {isAuthenticated
            ? authenticatedMobileNavItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={`mobile-${href}`}
                  href={href}
                  aria-label={label}
                  className={cn(navIconLinkClass, "sm:hidden")}
                >
                  <span className={navIconWrapperClass}>
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                </Link>
              ))
            : null}

          {navItems.map((item) => {
            const { href, label, icon: Icon } = item;
            const className = getNavItemClassName(href, isAuthenticated);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={className}
              >
                <span className={navIconWrapperClass}>
                  <Icon className="size-5 sm:size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}

          <ThemeToggle />

          {isAuthenticated ? (
            <AccountDropdown
              username={username}
              avatarUrl={avatarUrl}
              coins={coins}
              isMasterAdmin={isMasterAdmin}
              showTranslatorWorkspace={isMasterAdmin || isTranslator}
            />
          ) : null}
        </nav>
      </div>
    </header>
  );
}
