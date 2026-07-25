import { User } from "lucide-react";

import type { ForumAuthor } from "@/lib/forum/types";
import { cn } from "@/lib/utils";

export function ForumAvatar({
  author,
  className,
}: {
  author: ForumAuthor;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10",
        className,
      )}
    >
      {author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.avatarUrl}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <User className="size-4 text-accent" strokeWidth={1.75} aria-hidden />
      )}
    </span>
  );
}
