import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

const widthClass = {
  default: "max-w-6xl",
  prose: "max-w-4xl",
  narrow: "max-w-2xl",
} as const;

/** Caller-supplied pt/pb/py should replace the default vertical padding. */
function hasOwnVerticalPadding(className?: string) {
  return /(?:^|\s)(?:[\w-]+:)*(?:p[tyb]|py)-/.test(className ?? "");
}

export type PageWidth = keyof typeof widthClass;

/**
 * Mobile-first page wrapper that centers content and scales its gutters and
 * vertical rhythm with the viewport, so the body of every page resizes
 * consistently from small phones up to large screens.
 */
export function PageContainer({
  as: Tag = "div",
  width = "default",
  className,
  children,
}: {
  as?: ElementType;
  width?: PageWidth;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        !hasOwnVerticalPadding(className) && "py-8 sm:py-10 lg:py-12",
        widthClass[width],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
