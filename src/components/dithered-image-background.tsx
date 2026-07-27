/** CSS halftone dither for photo backgrounds (shared with Continue reading). */

import { cn } from "@/lib/utils";

const DITHER_MASK =
  "[mask-image:radial-gradient(circle,black_0_1px,transparent_1.25px)] [mask-size:4px_4px] [-webkit-mask-image:radial-gradient(circle,black_0_1px,transparent_1.25px)] [-webkit-mask-size:4px_4px]";

export function DitheredImageBackground({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full max-h-none max-w-none object-cover object-center opacity-35 grayscale contrast-150",
        DITHER_MASK,
        className,
      )}
    />
  );
}
