import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HomeSectionToggle } from "@/components/home-section-toggle";

/** Server section shell — only the collapse control is a client island. */
export function HomeSection({
  title,
  storageKey,
  defaultOpen = true,
  href,
  linkLabel,
  children,
  className = "mt-4 sm:mt-5",
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const panelId = `home-section-panel-${storageKey}`;

  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <HomeSectionToggle
          title={title}
          storageKey={storageKey}
          panelId={panelId}
          defaultOpen={defaultOpen}
        />
        {href && linkLabel ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium leading-none text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {linkLabel}
            <ArrowRight className="size-3.5" strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
      </div>

      <div id={panelId}>{children}</div>
    </section>
  );
}
