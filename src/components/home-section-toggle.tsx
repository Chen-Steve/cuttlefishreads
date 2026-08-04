"use client";

import { useLayoutEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function readStoredOpen(storageKey: string, defaultOpen: boolean) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // private mode / blocked storage
  }
  return defaultOpen;
}

/** Client-only collapse control; panel content stays a server-rendered sibling. */
export function HomeSectionToggle({
  title,
  storageKey,
  panelId,
  defaultOpen = true,
}: {
  title: string;
  storageKey: string;
  panelId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useLayoutEffect(() => {
    const next = readStoredOpen(storageKey, defaultOpen);
    setOpen(next);
    const panel = document.getElementById(panelId);
    if (panel) panel.hidden = !next;
  }, [storageKey, panelId, defaultOpen]);

  useLayoutEffect(() => {
    const panel = document.getElementById(panelId);
    if (panel) panel.hidden = !open;
  }, [open, panelId]);

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

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={toggle}
      className="inline-flex min-w-0 items-center gap-1.5 rounded-md text-left outline-offset-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
        {title}
      </h2>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted transition-transform",
          open && "rotate-180",
        )}
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}
