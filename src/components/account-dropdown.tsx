"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Cookie,
  Feather,
  LogOut,
  PenLine,
  Settings,
  User,
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { originalsPublicUrl } from "@/lib/hosts";
import { cn } from "@/lib/utils";

function AccountAvatar({
  avatarUrl,
  className,
}: {
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-accent",
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <User className="size-[55%]" strokeWidth={1.75} aria-hidden />
      )}
    </span>
  );
}

const triggerClass =
  "inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 pl-1.5 text-sm font-medium leading-none text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-9 sm:px-3 sm:pl-1.5";

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className =
    "flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background";

  return (
    <Link href={href} role="menuitem" onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

export function AccountDropdown({
  username,
  avatarUrl = null,
  coins = 0,
  isMasterAdmin = false,
  showCoins = true,
  /** Show the translator workspace link (/admin). */
  showTranslatorWorkspace = false,
  /** Show the author workspace link on the Originals subdomain. */
  showAuthorWorkspace = false,
  /**
   * Originals “Write” destination. When set, replaces the separate
   * author-workspace row with a Write entry.
   */
  writeHref,
  writeLabel = "Write",
  /** Override public profile URL (e.g. `/profiles/name` on Originals). */
  publicProfileHref,
  showPublicProfile = true,
  /** Override account settings URL (e.g. `/account` on Originals). */
  accountHref = "/account",
  /** Show theme toggle inside the menu (e.g. Originals header). */
  showThemeToggle = false,
}: {
  username?: string | null;
  avatarUrl?: string | null;
  coins?: number;
  isMasterAdmin?: boolean;
  showCoins?: boolean;
  showTranslatorWorkspace?: boolean;
  showAuthorWorkspace?: boolean;
  writeHref?: string;
  writeLabel?: string;
  publicProfileHref?: string;
  showPublicProfile?: boolean;
  accountHref?: string;
  showThemeToggle?: boolean;
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

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={username ? `Account menu for ${username}` : "Account menu"}
        className={triggerClass}
      >
        <AccountAvatar
          avatarUrl={avatarUrl}
          className="size-7 border border-border sm:size-6"
        />
        <span className="hidden max-w-32 truncate lg:inline">
          {username || "Account"}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-150 sm:size-3.5",
            open && "rotate-180",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1.5 min-w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-md"
        >
          <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
            <AccountAvatar
              avatarUrl={avatarUrl}
              className="size-9 border border-border"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {username || "Account"}
              </p>
              {showCoins ? (
                <p className="flex items-center gap-1 text-xs text-muted">
                  <Cookie
                    className="size-3 shrink-0 text-amber-500"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="font-semibold tabular-nums text-foreground">
                    {coins.toLocaleString()}
                  </span>
                  cookies
                </p>
              ) : (
                <p className="text-xs text-muted">Cuttlefish account</p>
              )}
            </div>
          </div>

          <MenuLink href={accountHref} onClick={close}>
            <Settings
              className="size-4 shrink-0 text-muted"
              strokeWidth={1.75}
              aria-hidden
            />
            Account
          </MenuLink>

          {username && showPublicProfile ? (
            <MenuLink
              href={publicProfileHref ?? `/u/${username}`}
              onClick={close}
            >
              <User
                className="size-4 shrink-0 text-muted"
                strokeWidth={1.75}
                aria-hidden
              />
              Public profile
            </MenuLink>
          ) : null}

          {writeHref ? (
            <MenuLink href={writeHref} onClick={close}>
              <Feather
                className="size-4 shrink-0 text-muted"
                strokeWidth={1.75}
                aria-hidden
              />
              {writeLabel}
            </MenuLink>
          ) : null}

          {showTranslatorWorkspace ? (
            <MenuLink href="/admin" onClick={close}>
              {isMasterAdmin ? (
                <Settings
                  className="size-4 shrink-0 text-muted"
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : (
                <PenLine
                  className="size-4 shrink-0 text-muted"
                  strokeWidth={1.75}
                  aria-hidden
                />
              )}
              {isMasterAdmin ? "Admin" : "Workspace"}
            </MenuLink>
          ) : null}

          {!writeHref && showAuthorWorkspace ? (
            <MenuLink href={originalsPublicUrl("/workspace")} onClick={close}>
              <PenLine
                className="size-4 shrink-0 text-muted"
                strokeWidth={1.75}
                aria-hidden
              />
              Author workspace
            </MenuLink>
          ) : null}

          {showThemeToggle ? <ThemeToggle variant="menu" /> : null}

          <div className="mx-2 border-t border-border" />

          <form action={signOut}>
            <input type="hidden" name="redirectTo" value="/login" />
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              <LogOut
                className="size-4 shrink-0 text-muted"
                strokeWidth={1.75}
                aria-hidden
              />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
