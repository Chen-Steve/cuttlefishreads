"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Warn before discarding in-progress edits: native beforeunload for refresh /
 * close, and a confirm step for in-app link clicks (including workspace nav).
 */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!dirtyRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.closest("[role='dialog']")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.origin !== window.location.origin) return;
      const current = new URL(window.location.href);
      if (
        url.pathname === current.pathname &&
        url.search === current.search &&
        url.hash === current.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const cancelLeave = useCallback(() => {
    setPendingHref(null);
  }, []);

  return {
    leaveOpen: pendingHref !== null,
    confirmLeave() {
      const href = pendingHref;
      setPendingHref(null);
      if (href) router.push(href);
    },
    cancelLeave,
  };
}
