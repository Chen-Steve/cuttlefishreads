"use client";

import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { useStoredOpen } from "@/hooks/use-stored-open";
import { cn } from "@/lib/utils";

export function AccountSection({
  title,
  storageKey,
  defaultOpen = true,
  headerAside,
  children,
  className,
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  headerAside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { open, toggle } = useStoredOpen(storageKey, defaultOpen);
  const panelId = useId();

  return (
    <div className={cn("border-t border-border/70 pt-2.5", className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md py-0.5 text-left outline-offset-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {title}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        {headerAside}
      </div>

      {open ? (
        <div id={panelId} className="mt-1.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}
