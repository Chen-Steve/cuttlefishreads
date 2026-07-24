"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/** 8×8 Bayer ordered-dither matrix, normalized to 0–1. */
const BAYER_8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => (v + 0.5) / 64));

function parseCssColor(color: string): [number, number, number] {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return [47, 93, 86];
}

function ditherImage(
  source: HTMLImageElement,
  /** Longest edge of the output bitmap. */
  maxEdge: number,
  ink: [number, number, number],
): HTMLCanvasElement {
  const aspect = source.naturalWidth / source.naturalHeight;
  const width =
    aspect >= 1 ? maxEdge : Math.max(1, Math.round(maxEdge * aspect));
  const height =
    aspect >= 1 ? Math.max(1, Math.round(maxEdge / aspect)) : maxEdge;

  const sample = document.createElement("canvas");
  sample.width = width;
  sample.height = height;
  const sctx = sample.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(source, 0, 0, width, height);

  const { data } = sctx.getImageData(0, 0, width, height);
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const octx = out.getContext("2d")!;
  const image = octx.createImageData(width, height);
  const [ir, ig, ib] = ink;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3] / 255;
      // Treat near-black canvas of the source as transparent.
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const isBg = luminance < 0.06 && a > 0.5;
      if (a < 0.08 || isBg) {
        image.data[i + 3] = 0;
        continue;
      }
      // Invert so darker ink/outlines produce denser dots.
      const coverage = (1 - luminance) * a;
      const threshold = BAYER_8[y & 7][x & 7];
      if (coverage > threshold) {
        image.data[i] = ir;
        image.data[i + 1] = ig;
        image.data[i + 2] = ib;
        image.data[i + 3] = 255;
      } else {
        image.data[i + 3] = 0;
      }
    }
  }

  octx.putImageData(image, 0, 0);
  return out;
}

export function DitheredLogoBackground({
  src = "/cuttle.png",
  className,
  size = 360,
}: {
  src?: string;
  className?: string;
  /** Longest edge of the dither bitmap (keeps the source aspect ratio). */
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = src;

    function paint() {
      if (cancelled || !canvas || !img.complete || img.naturalWidth === 0) {
        return;
      }
      const accent = getComputedStyle(canvas).getPropertyValue("--accent").trim();
      const ink = parseCssColor(accent || "#2f5d56");
      const dithered = ditherImage(img, size, ink);
      canvas.width = dithered.width;
      canvas.height = dithered.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(dithered, 0, 0);
    }

    img.onload = paint;
    if (img.complete) paint();

    // Re-dither when light/dark theme flips (accent changes).
    const root = document.documentElement;
    const observer = new MutationObserver(paint);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [src, size]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute h-auto w-auto max-w-none select-none [image-rendering:pixelated]",
        className,
      )}
    />
  );
}
