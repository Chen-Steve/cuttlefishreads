import { cn } from "@/lib/utils";

/** Shared ghost control used by prev/next, contents, and settings. */
export const readerChromeBtnClass =
  "inline-flex h-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm font-medium text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40";

export const readerChromeIconBtnClass = cn(readerChromeBtnClass, "size-8 shrink-0 px-0");
