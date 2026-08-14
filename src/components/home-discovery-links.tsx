"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dices } from "lucide-react";

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
    "relative isolate inline-flex min-h-16 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-border bg-surface px-3 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <section
      className="mt-4 grid grid-cols-2 gap-3 sm:mt-5"
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
          <Dices className="size-5" strokeWidth={1.75} aria-hidden />
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
          <DiscordIcon className="size-5" />
          Join our Discord!
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      </a>
    </section>
  );
}
