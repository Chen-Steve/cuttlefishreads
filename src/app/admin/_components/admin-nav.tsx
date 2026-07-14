"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

const baseLinks: NavLink[] = [
  { href: "/admin", label: "My Novels" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/settings", label: "Settings" },
];

const masterLinks: NavLink[] = [
  { href: "/admin/applications", label: "Applications" },
];

function ScrollArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={(e) => {
        if (disabled) return;
        onClick();
        e.currentTarget.blur();
      }}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      aria-label={direction === "left" ? "Scroll tabs left" : "Scroll tabs right"}
      className={cn(
        "absolute inset-y-0 z-10 inline-flex w-7 items-center justify-center bg-surface text-muted transition-colors [-webkit-tap-highlight-color:transparent] active:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden",
        direction === "left" ? "left-0" : "right-0",
        disabled ? "pointer-events-none text-muted/30" : "hover:text-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={2} aria-hidden />
    </button>
  );
}

export function AdminNav({ isMasterAdmin }: { isMasterAdmin: boolean }) {
  const pathname = usePathname();
  const links = isMasterAdmin ? [...baseLinks, ...masterLinks] : baseLinks;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState, links.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
    updateScrollState();
  }, [pathname, updateScrollState]);

  function scrollTabs(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    if (direction === -1 && !canScrollLeft) return;
    if (direction === 1 && !canScrollRight) return;
    el.scrollBy({
      left: direction * Math.max(120, el.clientWidth * 0.55),
      behavior: "smooth",
    });
  }

  return (
    <nav className="border-b border-border bg-surface">
      <div className="relative mx-auto flex w-full max-w-6xl items-stretch px-4 sm:px-6 lg:px-8">
        <div className="relative min-w-0 flex-1">
          <ScrollArrow
            direction="left"
            disabled={!canScrollLeft}
            onClick={() => scrollTabs(-1)}
          />
          <ScrollArrow
            direction="right"
            disabled={!canScrollRight}
            onClick={() => scrollTabs(1)}
          />

          <div
            ref={scrollRef}
            className="flex items-center gap-1 overflow-x-hidden touch-pan-y pl-7 pr-7 sm:overflow-x-visible sm:px-0"
          >
            <Link
              href="/"
              className="mr-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground sm:mr-2 sm:px-2.5"
            >
              <Home className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />

            {links.map((link) => {
              const active =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-active={active ? "true" : undefined}
                  className={cn(
                    "relative -mb-px shrink-0 whitespace-nowrap border-b-2 px-2.5 py-3 text-xs font-medium transition-colors sm:px-3 sm:py-3.5 sm:text-sm",
                    active
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center pl-2">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
