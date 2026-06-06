"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateUsername, type UsernameState } from "../actions";

export function UsernameForm({ currentUsername }: { currentUsername: string | null }) {
  const [state, formAction, pending] = useActionState<UsernameState, FormData>(
    updateUsername,
    {}
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.message && inputRef.current) {
      inputRef.current.blur();
    }
  }, [state.message]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          name="username"
          type="text"
          autoComplete="username"
          defaultValue={currentUsername ?? ""}
          placeholder="Choose a username"
          minLength={3}
          maxLength={30}
          className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-accent px-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
