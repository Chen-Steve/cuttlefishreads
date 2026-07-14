"use client";

import { useActionState } from "react";

import { submitTranslatorApplication, type ApplyState } from "./actions";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelClass = "text-xs font-medium text-muted";
const readonlyClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-muted";

export function ApplyForm({
  username,
  email,
}: {
  username: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(
    submitTranslatorApplication,
    {},
  );

  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-sm text-emerald-700 dark:text-emerald-400">
        <p className="font-semibold">Application received.</p>
        <p className="mt-1 text-emerald-700/90 dark:text-emerald-400/90">
          Thanks for applying. We&apos;ll review it and reach out on Discord if
          you&apos;re approved.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Username</label>
          <div className={readonlyClass + " flex items-center"}>
            {username || "—"}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Email</label>
          <div className={readonlyClass + " flex items-center"}>{email}</div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="apply-discord" className={labelClass}>
          Discord username
        </label>
        <input
          id="apply-discord"
          name="discord"
          required
          placeholder="yourname#0000 or @yourname"
          className={inputClass}
        />
        <span className="text-xs text-muted">
          So we can DM you about your application if needed.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="apply-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="apply-message"
          name="message"
          required
          rows={5}
          placeholder="What would you like to translate? Any experience or links?"
          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
