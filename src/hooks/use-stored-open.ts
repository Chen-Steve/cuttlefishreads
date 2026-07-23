"use client";

import { useEffect, useState } from "react";

/** Open/closed UI preference persisted in localStorage (`1` / `0`). */
export function useStoredOpen(storageKey: string, defaultOpen = true) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "1") setOpen(true);
      else if (raw === "0") setOpen(false);
    } catch {
      // private mode / blocked storage
    }
  }, [storageKey]);

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
