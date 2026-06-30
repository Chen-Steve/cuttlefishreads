import { cn } from "@/lib/utils";

const palettes = [
  "from-[#d8c3a5] to-[#a6845c]",
  "from-[#c9b79c] to-[#8c7355]",
  "from-[#e0cdb4] to-[#b8956a]",
  "from-[#cbb89d] to-[#9a7f5f]",
  "from-[#ddc9ad] to-[#ad8b62]",
  "from-[#d2bfa3] to-[#937a5b]",
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return palettes[hash % palettes.length];
}

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter((word) => /[a-z]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function NovelCover({
  title,
  slug,
  coverUrl,
  chapterCount,
  className,
}: {
  title: string;
  slug: string;
  coverUrl?: string;
  /** Shown as a badge on the top-right of the cover. */
  chapterCount?: number;
  className?: string;
}) {
  const badge =
    chapterCount != null ? (
      <span className="absolute top-1.5 right-1.5 z-10 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white backdrop-blur-sm">
        {chapterCount} ch
      </span>
    ) : null;

  if (coverUrl) {
    return (
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={title}
          draggable={false}
          className="h-full w-full object-cover"
        />
        {badge}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br shadow-sm ring-1 ring-black/5",
        paletteFor(slug),
        className,
      )}
      aria-hidden
    >
      <span className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(255,255,255,0.4)_10px,rgba(255,255,255,0.4)_11px)]" />
      <span className="font-semibold text-3xl text-white/90 drop-shadow-sm">
        {initials(title)}
      </span>
      {badge}
    </div>
  );
}
