import Link from "next/link";
import { Coffee, Heart } from "lucide-react";

import { renderMarkdownParagraphs, splitTextParagraphs } from "./chapter-markdown";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function TranslatorNote({
  name,
  username,
  note,
  kofiUrl,
  patreonUrl,
}: {
  name: string;
  username?: string;
  note: string | null;
  kofiUrl?: string;
  patreonUrl?: string;
}) {
  const hasLinks = Boolean(kofiUrl || patreonUrl);

  // Nothing worth showing — keep the page clean.
  if (!note && !hasLinks) return null;

  const paragraphs = note ? splitTextParagraphs(note) : [];

  const heading = (
    <>
      A note from{" "}
      {username ? (
        <Link
          href={`/u/${username}`}
          className="font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {name}
        </Link>
      ) : (
        <span className="font-semibold text-foreground">{name}</span>
      )}
    </>
  );

  return (
    <section
      aria-label={`A note from ${name}`}
      className="mt-6 rounded-xl border border-border bg-surface px-3.5 py-3 sm:px-4"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent"
        >
          {initials(name)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{heading}</p>

          {paragraphs.length > 0 && (
            <div className="mt-1.5 space-y-1.5 text-sm leading-snug text-foreground/90">
              {renderMarkdownParagraphs(paragraphs).map((children, index) => (
                <p key={index}>{children}</p>
              ))}
            </div>
          )}

          {hasLinks && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kofiUrl && (
                <a
                  href={kofiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#13C3FF] px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Coffee className="size-3.5" strokeWidth={2} aria-hidden />
                  Ko-fi
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              {patreonUrl && (
                <a
                  href={patreonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#FF424D] px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Heart className="size-3.5" strokeWidth={2} aria-hidden />
                  Patreon
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
