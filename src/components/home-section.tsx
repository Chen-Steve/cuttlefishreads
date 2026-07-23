"use client";

import { useId, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { useStoredOpen } from "@/hooks/use-stored-open";
import { cn } from "@/lib/utils";

export function HomeSection({
  title,
  storageKey,
  defaultOpen = true,
  href,
  linkLabel,
  children,
  className = "mt-4 sm:mt-5",
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const { open, toggle } = useStoredOpen(storageKey, defaultOpen);
  const panelId = useId();

  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className="inline-flex min-w-0 items-center gap-1.5 rounded-md text-left outline-offset-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
            {title}
          </h2>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        {href && linkLabel ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium leading-none text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {linkLabel}
            <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
      </div>

      {open ? <div id={panelId}>{children}</div> : null}
    </section>
  );
}
