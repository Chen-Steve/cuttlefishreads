"use client";

import { useState } from "react";
import { useHydratedState } from "@/hooks/use-hydrated-state";

export function readStoredOpen(storageKey: string, fallback: boolean) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // private mode / blocked storage
  }
  return fallback;
}

/** Open/closed UI preference persisted in localStorage (`1` / `0`). */
export function useStoredOpen(storageKey: string, defaultOpen = true) {
  const [open, setOpen] = useHydratedState(
    () => readStoredOpen(storageKey, defaultOpen),
    defaultOpen,
  );
  const [previousKey, setPreviousKey] = useState(storageKey);
  if (previousKey !== storageKey) {
    setPreviousKey(storageKey);
    setOpen(readStoredOpen(storageKey, open));
  }

  function toggle() {
    setOpen((current) => {
      const next = !current;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // private mode / blocked storage
      }
      return next;
    });
  }

  return { open, toggle, setOpen } as const;
}
