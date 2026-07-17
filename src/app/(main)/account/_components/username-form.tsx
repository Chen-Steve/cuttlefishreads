"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { updateUsername, type UsernameState } from "../actions";

export function UsernameForm({ currentUsername }: { currentUsername: string | null }) {
  const [state, formAction, pending] = useActionState<UsernameState, FormData>(
    updateUsername,
    {}
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const statusId = useId();

  useEffect(() => {
    if (state.message && inputRef.current) {
      inputRef.current.blur();
    }
  }, [state.message]);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label htmlFor={inputId} className="sr-only">
          Username
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="username"
          type="text"
          autoComplete="username"
          defaultValue={currentUsername ?? ""}
          placeholder="Choose a username"
          minLength={3}
          maxLength={30}
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
          {pending ? "…" : "Save"}
        </button>
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
