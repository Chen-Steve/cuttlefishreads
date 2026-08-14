import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HomeSectionToggle } from "@/components/home-section-toggle";
import { TabRail } from "@/components/tab-panel-shell";

/** Server section shell — only the collapse control is a client island. */
export function HomeSection({
  title,
  storageKey,
  defaultOpen = true,
  href,
  linkLabel,
  children,
  className = "mt-4 sm:mt-5",
  header = "plain",
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
  /** `rail` hangs the title and link on a connecting line — no section box. */
  header?: "plain" | "rail";
}) {
  const panelId = `home-section-panel-${storageKey}`;
  const viewAll =
    href && linkLabel ? (
      <Link
        href={href}
        className={
          header === "rail"
            ? "inline-flex h-9 items-center gap-1.5 pl-4 pr-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            : "inline-flex shrink-0 items-center gap-1 text-sm font-medium leading-none text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        }
      >
        {linkLabel}
        <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
      </Link>
    ) : null;

  const toggle = (
    <HomeSectionToggle
      title={title}
      storageKey={storageKey}
      panelId={panelId}
      defaultOpen={defaultOpen}
      className={header === "rail" ? "pl-2 pr-4" : undefined}
    />
  );

  return (
    <section className={className}>
      {header === "rail" ? (
        <TabRail leftTab={toggle} rightTab={viewAll ?? undefined} />
      ) : (
        <div className="mb-3 flex items-baseline justify-between gap-4">
          {toggle}
          {viewAll}
        </div>
      )}

      <div id={panelId} className={header === "rail" ? "pt-1" : undefined}>
        {children}
      </div>
    </section>
  );
}
