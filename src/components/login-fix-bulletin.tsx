"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { SITE } from "@/lib/constants";

const STORAGE_KEY = "cf-login-fix-bulletin-dismissed";

export function LoginFixBulletin() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // private mode / blocked storage — still hide for this session
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="mt-6 flex gap-3 rounded-xl border border-accent/25 bg-accent/8 px-3.5 py-3 sm:mt-8 sm:px-4 sm:py-3.5"
    >
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
        <span className="font-semibold text-accent">ATTENTION!</span>{" "}
        Apologies for the login issues. Please clear your cookies/cache for this
        site, then reopen it - login will be working again. Please reach out on{" "}

        <a
          href={SITE.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
        >
          Discord
          <span className="sr-only"> (opens in a new tab)</span>
        </a>{" "}
        for any other issues.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss bulletin"
        className="shrink-0 self-start rounded-md p-1 text-muted transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </aside>
  );
}
