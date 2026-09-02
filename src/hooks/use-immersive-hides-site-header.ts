"use client";

import { usePathname } from "next/navigation";

import { useReaderSettings } from "@/hooks/use-reader-settings";

const CHAPTER_PATH = /^\/(?:novels|series)\/[^/]+\/(?:chapter\/)?\d+\/?$/;

/** Hides the site header on chapter pages when immersive reading is on. */
export function useImmersiveHidesSiteHeader() {
  const pathname = usePathname();
  const { settings } = useReaderSettings();
  return settings.immersive && CHAPTER_PATH.test(pathname);
}
