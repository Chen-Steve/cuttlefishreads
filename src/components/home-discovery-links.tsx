"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dices, MessagesSquare } from "lucide-react";

import { getRandomTranslationHref } from "@/app/(main)/home-actions";
import { DiscordIcon } from "@/components/discord-icon";
import { DitheredImageBackground } from "@/components/dithered-image-background";
import { SITE } from "@/lib/constants";

function TileBackground({ src }: { src: string }) {
  return (
    <>
      <DitheredImageBackground src={src} className="-z-20" />
      <span
        className="pointer-events-none absolute inset-0 -z-10 bg-surface/50"
        aria-hidden
      />
    </>
  );
}

export function HomeDiscoveryLinks({
  hasNovels,
}: {
  hasNovels: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function openRandomNovel() {
    if (!hasNovels || busy) return;
    setBusy(true);
    try {
      const href = await getRandomTranslationHref();
      if (href) router.push(href);
    } finally {
      setBusy(false);
    }
  }

  const tileClass =
    "relative isolate inline-flex min-h-16 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-border bg-surface px-1.5 py-2 text-center text-[11px] leading-tight font-semibold text-foreground transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-1.5 sm:px-3 sm:py-3 sm:text-sm sm:leading-normal";

  return (
    <section
      className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3"
      aria-label="Quick links"
    >
      <button
        type="button"
        onClick={() => void openRandomNovel()}
        disabled={!hasNovels || busy}
        className={`${tileClass} hover:text-accent disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <TileBackground src="/background1.jpg" />
        <span className="relative z-10 inline-flex flex-col items-center gap-1.5">
          <Dices className="size-4 sm:size-5" strokeWidth={1.75} aria-hidden />
          Random novel
        </span>
      </button>

      <a
        href={SITE.discordUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${tileClass} hover:text-accent`}
      >
        <TileBackground src="/background2.jpg" />
        <span className="relative z-10 inline-flex flex-col items-center gap-1.5">
          <DiscordIcon className="size-4 sm:size-5" />
          Join our Discord!
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      </a>

      <Link href="/community" className={`${tileClass} hover:text-accent`}>
        <TileBackground src="/background1.jpg" />
        <span className="relative z-10 inline-flex flex-col items-center gap-1.5">
          <MessagesSquare className="size-4 sm:size-5" strokeWidth={1.75} aria-hidden />
          Community
        </span>
      </Link>
    </section>
  );
}
