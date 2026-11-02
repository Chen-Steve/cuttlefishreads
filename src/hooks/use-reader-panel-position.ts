"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

/** Keep reader popovers aligned with their navigation bar. */
export function useReaderPanelPosition(
  open: boolean,
  placement: "up" | "down",
  navRef: RefObject<HTMLElement | null>,
) {
  const [style, setStyle] = useState<CSSProperties>();

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const nav = navRef.current;
      if (!nav) return;

      const rect = nav.getBoundingClientRect();
      const gap = 8;
      setStyle({
        width: rect.width,
        left: rect.left,
        ...(placement === "up"
          ? { bottom: window.innerHeight - rect.top + gap, top: "auto" }
          : { top: rect.bottom + gap, bottom: "auto" }),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placement, navRef]);

  return open ? style : undefined;
}
