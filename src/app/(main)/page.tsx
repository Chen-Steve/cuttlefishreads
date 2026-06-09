import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Library } from "lucide-react";
import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getFeaturedNovels, getNovels } from "@/lib/data";
import { SITE } from "@/lib/constants";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Home",
  description: SITE.seoDescription,
  path: "/",
});

export default async function Home() {
  const [featured, all] = await Promise.all([
    getFeaturedNovels(),
    getNovels(),
  ]);
  const latest = all.slice(0, 5);

  return (
    <PageContainer className="pt-3 pb-6 sm:py-8 lg:py-10">
      <section className="relative hidden overflow-hidden rounded-xl border border-border bg-surface px-4 py-6 sm:block sm:px-8 sm:py-9">
        <span className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(135deg,transparent,transparent_14px,var(--accent)_14px,var(--accent)_15px)]" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            {SITE.name}
          </p>
          <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-balance text-foreground sm:text-3xl">
            {SITE.description}.
          </h1>
          <p className="mt-2.5 text-pretty text-sm leading-normal text-muted">
            Browse, follow your favorites,
            and pick up right where you left off.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/novels"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Browse novels
              <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
            </Link>
            <Link
              href="/library"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Library className="size-3.5" strokeWidth={1.75} aria-hidden />
              My library
            </Link>
          </div>
        </div>
      </section>

      <Section
        title="Featured"
        href="/novels"
        linkLabel="View all"
        className="mt-0 sm:mt-8"
      >
        <NovelGrid novels={featured} compact />
      </Section>

      <Section title="Recently updated" href="/novels" linkLabel="View all">
        <NovelGrid novels={latest} compact />
      </Section>
    </PageContainer>
  );
}

function Section({
  title,
  href,
  linkLabel,
  children,
  className = "mt-6 sm:mt-8",
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {linkLabel}
          <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}
