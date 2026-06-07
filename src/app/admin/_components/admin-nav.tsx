"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

const baseLinks: NavLink[] = [
  { href: "/admin", label: "My Novels" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Settings" },
];

const masterLinks: NavLink[] = [
  { href: "/admin/applications", label: "Applications" },
];

export function AdminNav({ isMasterAdmin }: { isMasterAdmin: boolean }) {
  const pathname = usePathname();
  const links = isMasterAdmin ? [...baseLinks, ...masterLinks] : baseLinks;

  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 sm:overflow-x-visible lg:px-8 [&::-webkit-scrollbar]:hidden">
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
    </nav>
  );
}
