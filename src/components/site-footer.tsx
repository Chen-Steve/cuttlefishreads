import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/constants";

const linkGroups = [
  {
    title: "Browse",
    links: [
      { href: "/novels", label: "All novels" },
      { href: "/library", label: "My library" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Login" },
      { href: "/signup", label: "Sign up" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Link
              href="/"
              aria-label="Cuttlefish Reads home"
              className="inline-flex items-center overflow-visible rounded-lg outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="relative flex h-9 w-12 shrink-0 items-center overflow-visible">
                <Image
                  src="/cuttle.png"
                  alt=""
                  width={24}
                  height={24}
                  className="pointer-events-none absolute top-1/2 left-0 h-28 w-auto -translate-y-1/2 object-contain"
                  aria-hidden
                />
              </span>
              <span className="text-lg ml-2 font-semibold tracking-tight text-foreground">
                {SITE.name}
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {SITE.description}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {linkGroups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="text-sm font-semibold text-foreground">
                  {group.title}
                </h2>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
