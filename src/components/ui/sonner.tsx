"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border bg-surface text-foreground shadow-md font-sans",
          title: "text-sm font-semibold",
          description: "text-sm text-muted",
          success: "[&_[data-icon]]:text-green-600",
          actionButton:
            "rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent-hover",
          cancelButton:
            "rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground",
        },
      }}
    />
  );
}
