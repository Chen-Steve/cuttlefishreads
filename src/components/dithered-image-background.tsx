/** CSS halftone dither for photo backgrounds (shared with Continue reading). */

import Image from "next/image";

import { cn } from "@/lib/utils";

const DITHER_MASK =
  "[mask-image:radial-gradient(circle,black_0_1px,transparent_1.25px)] [mask-size:4px_4px] [-webkit-mask-image:radial-gradient(circle,black_0_1px,transparent_1.25px)] [-webkit-mask-size:4px_4px]";

export function DitheredImageBackground({
  src,
  className,
  sizes = "24rem",
}: {
  src: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      quality={60}
      aria-hidden
      draggable={false}
      className={cn(
        "pointer-events-none object-cover object-center opacity-35 grayscale contrast-150",
        DITHER_MASK,
        className,
      )}
    />
  );
}
