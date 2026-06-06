"use client";

import { useState } from "react";

import {
  renderInlineMarkdown,
  splitTextParagraphs,
} from "@/components/reader/chapter-content";

const COLLAPSED_DESCRIPTION_LENGTH = 400;

function truncateDescription(text: string): string {
  if (text.length <= COLLAPSED_DESCRIPTION_LENGTH) return text;

  const slice = text.slice(0, COLLAPSED_DESCRIPTION_LENGTH);
  const lastSpace = slice.lastIndexOf(" ");
  const truncated = lastSpace > 320 ? slice.slice(0, lastSpace) : slice;

  return `${truncated.replace(/[.,;:!?-]+$/, "")}...`;
}

export function NovelDescription({ synopsis }: { synopsis: string }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = synopsis.length > COLLAPSED_DESCRIPTION_LENGTH;
  const displayText = expanded || !canExpand ? synopsis : truncateDescription(synopsis);
  const paragraphs = splitTextParagraphs(displayText);

  if (paragraphs.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-wrap">
            {renderInlineMarkdown(paragraph)}
          </p>
        ))}
      </div>

      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-expanded={expanded}
        >
          {expanded ? "Hide description" : "Show full description"}
        </button>
      ) : null}
    </div>
  );
}
