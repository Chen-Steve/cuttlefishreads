"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  applyAnalyticsConsent,
  isAnalyticsConsentRegionCookiePresent,
  readStoredAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAnalyticsConsentRegionCookiePresent()) return;
    setVisible(readStoredAnalyticsConsent() === null);
  }, []);

  if (!visible) return null;

  const choose = (consent: AnalyticsConsent) => {
    applyAnalyticsConsent(consent);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-lg sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4">
        <div className="min-w-0 flex-1">
          <p
            id="cookie-consent-title"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Analytics cookies
          </p>
          <p
            id="cookie-consent-desc"
            className="mt-1 text-sm leading-relaxed text-muted"
          >
            We use Google Analytics to understand how the site is used. Essential
            cookies for sign-in still work either way.{" "}
            <Link
              href="/privacy"
              className="font-medium text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
          <button
            type="button"
            onClick={() => choose("granted")}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => choose("denied")}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
