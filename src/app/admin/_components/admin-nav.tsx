"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

const baseLinks: NavLink[] = [
  { href: "/admin", label: "My Novels" },
  { href: "/admin/dashboard", label: "Dashboard" },
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
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mr-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <Home className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          Home
        </Link>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

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
                "relative -mb-px border-b-2 px-3 py-3.5 text-sm font-medium transition-colors",
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
