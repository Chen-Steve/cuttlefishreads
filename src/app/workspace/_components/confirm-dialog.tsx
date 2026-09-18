"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { TabPanelShell } from "@/components/tab-panel-shell";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
  cancelLabel = "Cancel",
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm"
      >
        <TabPanelShell
          leftTab={
            <h2
              id="confirm-dialog-title"
              className="flex h-9 items-center px-4 text-sm font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
          }
        >
          <div className="px-4 py-3">
            <div className="text-sm text-muted">{children}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="inline-flex h-9 items-center rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-400"
              >
                {pending ? pendingLabel : confirmLabel}
              </button>
            </div>
          </div>
        </TabPanelShell>
      </div>
    </div>,
    document.body,
  );
}
