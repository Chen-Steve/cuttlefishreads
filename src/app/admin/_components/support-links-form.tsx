"use client";

import { useActionState } from "react";

import { updateSupportLinks, type SupportLinksState } from "../actions";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelClass = "text-xs font-medium text-muted";

export function SupportLinksForm({
  initial,
}: {
  initial: {
    globalNote: string | null;
    kofiUrl: string | null;
    patreonUrl: string | null;
  };
}) {
  const [state, action, pending] = useActionState<SupportLinksState, FormData>(
    updateSupportLinks,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="global-note" className={labelClass}>
          Global message
          <span className="ml-1 font-normal opacity-60">(optional)</span>
        </label>
        <textarea
          id="global-note"
          name="globalNote"
          rows={4}
          defaultValue={initial.globalNote ?? ""}
          placeholder="A default message shown at the end of chapters that use your global note."
          className="block w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <span className="text-xs text-muted">
          Used on chapters set to &ldquo;Use global message.&rdquo; **bold** and
          _italic_ are supported.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="kofi-url" className={labelClass}>
          Ko-fi link
          <span className="ml-1 font-normal opacity-60">(optional)</span>
        </label>
        <input
          id="kofi-url"
          name="kofiUrl"
          type="url"
          inputMode="url"
          defaultValue={initial.kofiUrl ?? ""}
          placeholder="https://ko-fi.com/yourname"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="patreon-url" className={labelClass}>
          Patreon link
          <span className="ml-1 font-normal opacity-60">(optional)</span>
        </label>
        <input
          id="patreon-url"
          name="patreonUrl"
          type="url"
          inputMode="url"
          defaultValue={initial.patreonUrl ?? ""}
          placeholder="https://patreon.com/yourname"
          className={inputClass}
        />
      </div>

      <span className="text-xs text-muted">
        Support links appear with your note at the end of chapters. Leave a link
        blank to hide that button.
      </span>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
