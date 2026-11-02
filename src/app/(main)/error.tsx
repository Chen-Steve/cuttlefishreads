"use client";

import { PageContainer } from "@/components/page-container";

export default function PageError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <PageContainer className="py-12">
      <div role="alert" className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">Could not load this page</h1>
        <p className="text-sm text-muted">Please try again in a moment.</p>
        <button type="button" onClick={retry}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          Try again
        </button>
      </div>
    </PageContainer>
  );
}
