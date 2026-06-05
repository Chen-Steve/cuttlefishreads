import Link from "next/link";
import { ArrowRight, Library } from "lucide-react";
import { NovelGrid } from "@/components/novel";
import { PageContainer } from "@/components/page-container";
import { getFeaturedNovels, getNovels } from "@/lib/data";
import { SITE } from "@/lib/constants";

export default async function Home() {
  const [featured, all] = await Promise.all([
    getFeaturedNovels(),
    getNovels(),
  ]);
  const latest = all.slice(0, 5);

  return (
    <PageContainer>
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-10 sm:px-10 sm:py-16">
        <span className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(135deg,transparent,transparent_14px,var(--accent)_14px,var(--accent)_15px)]" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent sm:text-sm">
            {SITE.name}
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-balance text-foreground sm:text-4xl">
            {SITE.description}.
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted">
            Browse, follow your favorites,
            and pick up right where you left off.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/novels"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Browse novels
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
            <Link
              href="/library"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Library className="size-4" strokeWidth={1.75} aria-hidden />
              My library
            </Link>
          </div>
        </div>
      </section>

      <Section title="Featured" href="/novels" linkLabel="View all">
        <NovelGrid novels={featured} />
      </Section>

      <Section title="Recently updated" href="/novels" linkLabel="View all">
        <NovelGrid novels={latest} />
      </Section>
    </PageContainer>
  );
}

function Section({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
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
