"use client";

import { useActionState } from "react";

import { GENRES } from "@/lib/constants";
import { createNovel, type AdminState } from "../actions";

const STATUSES = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
] as const;

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelClass = "text-xs font-medium text-muted";

export function NovelForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    createNovel,
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="novel-title" className={labelClass}>
          Title
        </label>
        <input
          id="novel-title"
          name="title"
          required
          placeholder="The Lantern of Quiet Tides"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novel-author" className={labelClass}>
            Original author
          </label>
          <input
            id="novel-author"
            name="originalAuthor"
            placeholder="Original author name"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novel-translator" className={labelClass}>
            Translator
          </label>
          <input
            id="novel-translator"
            name="translator"
            placeholder="Translator name"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="novel-description" className={labelClass}>
          Description
        </label>
        <textarea
          id="novel-description"
          name="description"
          rows={4}
          placeholder="A short synopsis…"
          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Genres</legend>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <label
              key={genre}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
            >
              <input
                type="checkbox"
                name="genres"
                value={genre}
                className="size-3.5 accent-accent"
              />
              {genre}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novel-tags" className={labelClass}>
            Tags
          </label>
          <input
            id="novel-tags"
            name="tags"
            placeholder="cultivation, slow burn, strong lead"
            className={inputClass}
          />
          <span className="text-xs text-muted">Comma-separated.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="novel-status" className={labelClass}>
            Status
          </label>
          <select id="novel-status" name="status" className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="novel-cover" className={labelClass}>
          Cover image
        </label>
        <input
          id="novel-cover"
          name="cover"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-accent-hover"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
      >
        {pending ? "Creating…" : "Create novel"}
      </button>
    </form>
  );
}
