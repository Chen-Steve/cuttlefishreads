"use client";

/**
 * Inline script that executes on SSR / hard navigations, but is inert on
 * client renders (React 19 warns about executable <script> in components).
 * Must be a client component so the type re-evaluates to "text/plain" in the
 * browser; the server-rendered "text/javascript" copy has already run by then.
 * @see https://nextjs.org/docs/app/guides/preventing-flash-before-hydration
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
