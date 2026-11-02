"use client";

import { useLayoutEffect } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useStoredOpen } from "@/hooks/use-stored-open";

/** Client-only collapse control; panel content stays a server-rendered sibling. */
export function HomeSectionToggle({
  title,
  storageKey,
  panelId,
  defaultOpen = true,
  className,
}: {
  title: string;
  storageKey: string;
  panelId: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const { open, toggle } = useStoredOpen(storageKey, defaultOpen);

  useLayoutEffect(() => {
    const panel = document.getElementById(panelId);
    if (panel) panel.hidden = !open;
  }, [open, panelId]);

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={toggle}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 px-4 text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <h2>{title}</h2>
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
