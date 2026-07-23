"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { updatePassword, type PasswordState } from "../actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(
    updatePassword,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const passwordId = useId();
  const confirmId = useId();
  const errorId = useId();
  const statusId = useId();

  useEffect(() => {
    if (state.message && formRef.current) {
      formRef.current.reset();
    }
  }, [state.message]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={passwordId}
          className="text-[11px] font-medium uppercase tracking-wide text-muted"
        >
          New password
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          minLength={6}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={
            state.error ? errorId : state.message ? statusId : undefined
          }
          className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={confirmId}
          className="text-[11px] font-medium uppercase tracking-wide text-muted"
        >
          Confirm password
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id={confirmId}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat new password"
            minLength={6}
            aria-invalid={state.error ? true : undefined}
            aria-describedby={
              state.error ? errorId : state.message ? statusId : undefined
            }
            className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-accent px-2.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "…" : "Update"}
          </button>
        </div>
      </div>

      {state.error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          id={statusId}
          role="status"
          className="text-xs text-emerald-700 dark:text-emerald-400"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
