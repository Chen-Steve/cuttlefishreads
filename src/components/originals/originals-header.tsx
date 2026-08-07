"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, BookOpen, LogIn, MessagesSquare } from "lucide-react";

import { AccountDropdown } from "@/components/account-dropdown";
import {
  OriginalsHeaderSearch,
  OriginalsSearchOverlay,
  OriginalsSearchTrigger,
} from "@/components/originals/originals-expandable-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { ORIGINALS, SITE } from "@/lib/constants";
import { forumInboxUrl, forumUrl } from "@/lib/forum/constants";
import {
  creatorPublicOrigin,
  mainPublicOrigin,
  originalsPublicUrl,
} from "@/lib/hosts";
import { cn } from "@/lib/utils";

const nav = [
  {
    href: originalsPublicUrl("/latest"),
    label: "Latest",
    match: (p: string) => p.startsWith("/latest"),
  },
  {
    href: originalsPublicUrl("/browse"),
    label: "Browse",
    match: (p: string) => p.startsWith("/browse"),
  },
] as const;

const navLinkClass =
  "hidden h-9 items-center rounded-lg px-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex";

export function OriginalsHeader({
  isAuthenticated = false,
  username = null,
  avatarUrl = null,
  isMasterAdmin = false,
  hasCreatorSubdomain = false,
  unreadNotifications = 0,
}: {
  isAuthenticated?: boolean;
  username?: string | null;
  avatarUrl?: string | null;
  isMasterAdmin?: boolean;
  hasCreatorSubdomain?: boolean;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const homeHref = originalsPublicUrl();
  const loginHref = originalsPublicUrl("/login?redirect=/");

  return (
    <header className="relative z-50 overflow-visible border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="relative z-50 mx-auto flex h-16 max-w-6xl items-center gap-3 overflow-visible px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link
          href={homeHref}
          className={cn(
            "group inline-flex min-w-0 shrink-0 items-center gap-2 rounded-lg outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent",
            searchExpanded && "invisible",
          )}
          aria-label={`${ORIGINALS.name} home`}
          tabIndex={searchExpanded ? -1 : undefined}
        >
          <span className="relative flex h-9 w-10 shrink-0 items-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cuttle.png"
              alt=""
              width={36}
              height={36}
              className="pointer-events-none absolute top-1/2 left-0 h-9 w-auto -translate-y-1/2 object-contain"
              aria-hidden
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
              {ORIGINALS.shortName}
            </span>
            <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.14em] text-accent sm:block">
              {SITE.shortName}
            </span>
          </span>
        </Link>

        <div className="relative z-50 mx-auto hidden min-w-0 w-full max-w-md flex-1 sm:block">
          <OriginalsHeaderSearch />
        </div>

        <div
          className={cn(
            "pointer-events-none min-w-0 flex-1 sm:hidden",
            searchExpanded && "invisible",
          )}
        />

        <nav
          className={cn(
            "flex shrink-0 items-center gap-0.5 sm:gap-1",
            searchExpanded && "invisible",
          )}
          aria-label="Originals"
          aria-hidden={searchExpanded}
        >
          {nav.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                tabIndex={searchExpanded ? -1 : undefined}
                className={cn(
                  navLinkClass,
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-surface hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href={originalsPublicUrl("/browse")}
            aria-label="Browse originals"
            tabIndex={searchExpanded ? -1 : undefined}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden",
              pathname.startsWith("/browse")
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            <BookOpen className="size-5" strokeWidth={1.75} aria-hidden />
          </Link>

          <OriginalsSearchTrigger onOpen={() => setSearchExpanded(true)} />

          <Link
            href={forumUrl()}
            tabIndex={searchExpanded ? -1 : undefined}
            aria-label="Forum"
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-9 sm:w-auto sm:px-2.5",
              pathname.startsWith("/forum")
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            <MessagesSquare
              className="size-5 sm:hidden"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="hidden text-sm font-medium sm:inline">Forum</span>
          </Link>

          {isAuthenticated ? (
            <Link
              href={forumInboxUrl()}
              tabIndex={searchExpanded ? -1 : undefined}
              aria-label={
                unreadNotifications > 0
                  ? `Inbox, ${unreadNotifications} unread`
                  : "Inbox"
              }
              className={cn(
                "relative inline-flex size-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-9",
                pathname.startsWith("/forum/inbox")
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground",
              )}
            >
              <Bell className="size-5" strokeWidth={1.75} aria-hidden />
              {unreadNotifications > 0 ? (
                <span
                  className="absolute top-1.5 right-1.5 min-w-4 rounded-md bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-foreground tabular-nums sm:top-1 sm:right-1"
                  aria-hidden
                >
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </Link>
          ) : null}

          {!isAuthenticated ? (
            <Link
              href={loginHref}
              tabIndex={searchExpanded ? -1 : undefined}
              className="inline-flex size-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-9 sm:w-auto sm:px-2.5"
            >
              <LogIn className="size-5 sm:hidden" strokeWidth={1.75} aria-hidden />
              <span className="hidden text-sm font-medium sm:inline">Log in</span>
            </Link>
          ) : null}

          {isAuthenticated ? (
            <AccountDropdown
              username={username}
              avatarUrl={avatarUrl}
              isMasterAdmin={isMasterAdmin}
              showCoins={false}
              showThemeToggle
              writeHref={originalsPublicUrl("/workspace")}
              writeLabel={ORIGINALS.writeCta}
              libraryHref={originalsPublicUrl("/library")}
              publicProfileHref={
                username
                  ? hasCreatorSubdomain
                    ? creatorPublicOrigin(username)
                    : originalsPublicUrl(`/profiles/${username}`)
                  : undefined
              }
              accountHref={originalsPublicUrl("/account")}
              notificationsHref={`${mainPublicOrigin()}/notifications`}
              unreadNotifications={unreadNotifications}
            />
          ) : (
            <ThemeToggle />
          )}
        </nav>

        {searchExpanded ? (
          <OriginalsSearchOverlay onClose={() => setSearchExpanded(false)} />
        ) : null}
      </div>
    </header>
  );
}
