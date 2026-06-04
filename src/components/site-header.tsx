"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, LogIn, Library, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/novels", label: "Novels", icon: BookOpen },
  { href: "/login", label: "Login / Sign Up", icon: LogIn },
] as const;

export function SiteHeader() {
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
        <form
          className="mx-auto hidden w-full max-w-md flex-1 sm:block"
          role="search"
          action="/search"
        >
          <label className="flex h-9 w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface py-0 pr-4 pl-3.5 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
            <Search
              className="size-4 shrink-0 text-muted"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              name="q"
              placeholder="Search novels, authors…"
              className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium leading-none text-foreground outline-none placeholder:font-medium placeholder:leading-none placeholder:text-muted/80"
              aria-label="Search"
            />
          </label>
        </form>

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
            className="inline-flex size-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden"
          >
            <Search className="size-4" strokeWidth={1.75} aria-hidden />
          </button>

          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium leading-none text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-3"
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Expanded mobile search — overlays the bar when open */}
        <form
          role="search"
          action="/search"
          className={cn(
            "absolute inset-x-2 z-20 items-center gap-2 bg-background sm:!hidden",
            searchOpen ? "flex" : "hidden"
          )}
        >
          <label className="flex h-9 w-full cursor-text items-center gap-2 rounded-full border border-border bg-surface py-0 pr-3 pl-3.5 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
            <Search
              className="size-4 shrink-0 text-muted"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              ref={mobileInputRef}
              type="search"
              name="q"
              placeholder="Search novels, authors…"
              className="min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-medium leading-none text-foreground outline-none placeholder:font-medium placeholder:leading-none placeholder:text-muted/80"
              aria-label="Search"
            />
          </label>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}
