"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dices } from "lucide-react";

import { getRandomTranslationHref } from "@/app/(main)/home-actions";
import { DiscordIcon } from "@/components/discord-icon";
import { DitheredImageBackground } from "@/components/dithered-image-background";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const tileClass =
  "relative isolate inline-flex min-h-16 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-border bg-surface px-1.5 py-2 text-center text-[11px] leading-tight font-semibold text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-1.5 sm:px-3 sm:py-3 sm:text-sm sm:leading-normal";

function TileBackground({ src }: { src: string }) {
  return (
    <span className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <DitheredImageBackground
        src={src}
        sizes="(max-width: 640px) 46vw, (max-width: 1152px) calc(50vw - 2rem), 34rem"
      />
      <span className="absolute inset-0 bg-surface/50" />
    </span>
  );
}

export function HomeDiscoveryLinks({
  hasNovels,
}: {
  hasNovels: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function openRandomNovel() {
    if (!hasNovels) return;
    startTransition(async () => {
      const href = await getRandomTranslationHref().catch(() => null);
      if (href) router.push(href);
    });
  }

  return (
    <section
      className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3"
      aria-label="Quick links"
    >
      <button
        type="button"
        onClick={openRandomNovel}
        disabled={!hasNovels || pending}
        aria-busy={pending}
        className={cn(
          tileClass,
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
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
        className={tileClass}
      >
        <TileBackground src="/background2.jpg" />
        <span className="relative z-10 inline-flex flex-col items-center gap-1.5">
          <DiscordIcon className="size-4 sm:size-5" />
          Join our Discord!
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      </a>
    </section>
  );
}
