import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { NovelForm } from "../../_components/novel-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CreateNovelPage() {
  return (
    <PageContainer as="div" width="default">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to novels
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
        Create novel
      </h1>

      <div className="mt-8">
        <NovelForm />
      </div>
    </PageContainer>
  );
}
