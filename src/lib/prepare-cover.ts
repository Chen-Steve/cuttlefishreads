import {
  MAX_COVER_BYTES,
  MAX_COVER_SOURCE_BYTES,
} from "@/lib/cover-file";

const MAX_WIDTH = 800;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 0.86;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not read that image. Try JPEG, PNG, or WebP.")),
    );
    image.src = src;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Could not process that cover image."));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * Resize and JPEG-compress a cover so the create/update action stays under
 * the platform request-size limit. Large PNGs otherwise fail with Next.js's
 * generic "This page couldn't load" screen before the novel is inserted.
 */
export async function prepareCoverFile(file: File): Promise<File> {
  if (file.size > MAX_COVER_SOURCE_BYTES) {
    throw new Error(
      `Cover image is too large (max ${MAX_COVER_SOURCE_BYTES / 1024 / 1024} MB). Try a smaller image.`,
    );
  }
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Cover must be an image file (JPEG, PNG, WebP, or GIF).");
  }

  const src = URL.createObjectURL(file);
  try {
    const image = await loadImage(src);
    const scale = Math.min(
      1,
      MAX_WIDTH / Math.max(image.width, 1),
      MAX_HEIGHT / Math.max(image.height, 1),
    );
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that cover image.");
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await canvasToJpeg(canvas);
    if (blob.size > MAX_COVER_BYTES) {
      throw new Error(
        `Cover image is too large (max ${MAX_COVER_BYTES / 1024 / 1024} MB). Try a smaller image.`,
      );
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "cover";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(src);
  }
}
