"use client";

import { useState } from "react";

const VISIBLE_TAG_COUNT = 10;

export function NovelTags({ tags }: { tags: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) return null;

  const canExpand = tags.length > VISIBLE_TAG_COUNT;
  const visibleTags =
    expanded || !canExpand ? tags : tags.slice(0, VISIBLE_TAG_COUNT);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Tags">
        {visibleTags.map((tag) => (
          <span key={tag} className="text-xs text-muted">
            #{tag}
          </span>
        ))}
      </div>

      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-expanded={expanded}
        >
          {expanded ? "Hide tags" : `Show all ${tags.length} tags`}
        </button>
      ) : null}
    </div>
  );
}
