"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";

const STORAGE_KEY = "cf-adult-content-acknowledged";

export function AdultContentWarning() {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem(STORAGE_KEY) === "1";
      setOpen(!acknowledged);
    } catch {
      setOpen(true);
    }
    setChecked(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // private mode / blocked storage — still allow continue this session
    }
    setOpen(false);
  };

  const leave = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/novels");
  };

  if (!checked) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-[3px]"
        aria-hidden
      />
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[3px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lg"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/10">
          <TriangleAlert
            className="size-5 text-accent"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
        <h2
          id={titleId}
          className="mt-4 text-center text-lg font-semibold text-foreground"
        >
          Warning: 18+
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-muted">
          This novel is marked Adult and may contain mature content. You must be
          18 or older to continue.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={acknowledge}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            I am 18 or older
          </button>
          <button
            type="button"
            onClick={leave}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
