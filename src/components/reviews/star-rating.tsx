import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Read-only star row, filled to the nearest half via partial overlay. */
export function StarRating({
  value,
  className,
  starClassName = "size-4",
}: {
  value: number;
  className?: string;
  starClassName?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className={cn("relative", starClassName)}>
            <Star
              className={cn(starClassName, "text-border")}
              strokeWidth={1.75}
              aria-hidden
            />
            {fill > 0 ? (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={cn(starClassName, "fill-amber-500 text-amber-500")}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
