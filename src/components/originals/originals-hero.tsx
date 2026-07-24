"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

import { DitheredLogoBackground } from "@/components/originals/dithered-logo-background";
import { OriginalsWriteButton } from "@/components/originals/originals-write-button";
import { useStoredOpen } from "@/hooks/use-stored-open";
import { ORIGINALS } from "@/lib/constants";

const STORAGE_KEY = "cf-originals-hero";

export function OriginalsHero({
  isAuthenticated,
  workspaceHref,
  signupHref,
}: {
  isAuthenticated: boolean;
  workspaceHref: string;
  signupHref: string;
}) {
  const { open, toggle } = useStoredOpen(STORAGE_KEY, true);

  if (!open) return null;

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface px-4 py-5 sm:px-5 sm:py-7">
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 0% 100%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 55%)",
        }}
        aria-hidden
      />
      <DitheredLogoBackground
        size={560}
        className="top-1/2 left-[-18%] h-[140%] -translate-y-1/2 opacity-[0.5] sm:left-[-8%] sm:h-[155%] sm:opacity-[0.55] md:left-[-2%] lg:left-0 dark:opacity-40"
      />

      <button
        type="button"
        onClick={toggle}
        aria-label="Dismiss intro"
        className="absolute top-2 right-2 z-10 inline-flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X className="size-5" strokeWidth={2} aria-hidden />
      </button>

      <div className="relative max-w-xl pr-10 sm:max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          {ORIGINALS.name}
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-balance text-foreground sm:text-4xl">
          {ORIGINALS.description}
        </h1>
        <p className="mt-3 max-w-xl rounded-xl bg-surface/90 px-3 py-2 text-pretty text-sm leading-relaxed text-muted backdrop-blur-[2px] sm:text-base">
          Support authors directly on Ko-fi and Patreon.
        </p>
        <div className="mt-6 flex flex-row flex-wrap gap-2">
          <Link
            href="/browse"
            className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none sm:px-4"
          >
            Browse
            <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
          </Link>
          <OriginalsWriteButton
            isAuthenticated={isAuthenticated}
            workspaceHref={workspaceHref}
            signupHref={signupHref}
            label={ORIGINALS.writeCta}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-foreground hover:border-accent hover:text-accent sm:flex-none sm:px-4"
          />
        </div>
      </div>
    </section>
  );
}
