import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { NovelForm } from "../../_components/novel-form";

export const metadata: Metadata = {
  title: "Admin — Create Novel",
  robots: { index: false, follow: false },
};

export default async function CreateNovelPage() {
  const access = await getAdminAccess();

  return (
    <PageContainer as="div" width="prose">
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

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <NovelForm canEditAttribution={access?.isMasterAdmin ?? false} />
      </div>
    </PageContainer>
  );
}
