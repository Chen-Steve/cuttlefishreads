import Link from "next/link";
import Image from "next/image";
import { ORIGINALS } from "@/lib/constants";
import { mainPublicOrigin, originalsPublicUrl } from "@/lib/hosts";

export function OriginalsFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
        <div className="max-w-sm">
          <Link
            href={originalsPublicUrl()}
            className="inline-flex items-center gap-2 rounded-lg outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="relative flex h-8 w-10 shrink-0 items-center overflow-hidden">
              <Image
                src="/cuttle.png"
                alt=""
                width={24}
                height={24}
                className="pointer-events-none absolute top-1/2 left-0 h-8 w-auto -translate-y-1/2 object-contain"
                aria-hidden
              />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              {ORIGINALS.name}
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {ORIGINALS.description}. support authors on Ko-fi and Patreon.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link
            href={originalsPublicUrl("/browse")}
            className="text-muted transition-colors hover:text-accent"
          >
            Browse
          </Link>
          <Link
            href={originalsPublicUrl("/latest")}
            className="text-muted transition-colors hover:text-accent"
          >
            Latest
          </Link>
          <Link
            href={`${mainPublicOrigin()}/privacy`}
            className="text-muted transition-colors hover:text-accent"
          >
            Privacy
          </Link>
          <Link
            href={`${mainPublicOrigin()}/terms`}
            className="text-muted transition-colors hover:text-accent"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
