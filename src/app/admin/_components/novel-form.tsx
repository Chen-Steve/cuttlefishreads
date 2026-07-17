"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";

import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { GENRES, LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { createNovel, updateNovel, type AdminState } from "../actions";
import { DeleteNovelButton } from "./delete-novel-button";

const STATUSES = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
] as const;

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelClass = "text-xs font-medium text-muted";
const panelClass = "rounded-2xl border border-border bg-surface p-5 sm:p-6";

export type NovelFormValues = {
  id: string;
  title: string;
  original_author: string | null;
  translator: string | null;
  description: string | null;
  cover_url: string | null;
  genres: string[];
  tags: string[];
  status: string;
  language: string;
  novelupdates_url: string | null;
};

export function NovelForm({
  novel,
  header,
}: {
  novel?: NovelFormValues;
  header?: ReactNode;
}) {
  const isEdit = Boolean(novel);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const localCoverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile],
  );

  useEffect(() => {
    return () => {
      if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    };
  }, [localCoverPreview]);

  // Pass the selected file as a bound argument — FormData file fields are
  // unreliable with useActionState on Next.js 16.2.x (they can arrive empty).
  const boundAction = isEdit
    ? updateNovel.bind(null, novel!.id, coverFile)
    : createNovel.bind(null, coverFile);

  const [state, action, pending] = useActionState<AdminState, FormData>(
    boundAction,
    {},
  );

  const displayCover = localCoverPreview ?? novel?.cover_url ?? null;

  const submitButton = (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
        header ? "h-10 px-4" : "h-11 px-5 sm:w-fit",
      )}
    >
      {pending
        ? isEdit
          ? "Saving…"
          : "Creating…"
        : isEdit
          ? "Save changes"
          : "Create novel"}
    </button>
  );

  return (
    <form
      action={action}
      className={cn("flex flex-col", header ? "gap-3" : "gap-5")}
    >
      {header ? (
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {header}
          </div>
          {submitButton}
        </div>
      ) : null}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-start">
        <div className={cn(panelClass, "flex flex-col gap-5")}>
          <div className="grid gap-5 sm:grid-cols-[7.5rem_1fr] sm:items-start">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="novel-cover" className={labelClass}>
                Cover
              </label>
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border bg-background ring-1 ring-black/5 dark:ring-white/10">
                {displayCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayCover}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center px-2 text-center text-[0.65rem] leading-tight text-muted/70">
                    No cover yet
                  </div>
                )}
              </div>
              <input
                id="novel-cover"
                name="cover"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                onChange={(event) =>
                  setCoverFile(event.target.files?.[0] ?? null)
                }
                className="block w-full text-transparent text-xs file:mr-0 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-accent-foreground hover:file:bg-accent-hover"
              />
              {coverFile ? (
                <span className="text-[0.7rem] leading-tight text-muted">
                  Selected: {coverFile.name}
                </span>
              ) : isEdit ? (
                <span className="text-[0.7rem] leading-tight text-muted">
                  Leave empty to keep current cover.
                </span>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="novel-title" className={labelClass}>
                Title
              </label>
              <input
                id="novel-title"
                name="title"
                required
                defaultValue={novel?.title}
                placeholder="The Lantern of Quiet Tides"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="novel-description" className={labelClass}>
              Description
            </label>
            <RichTextEditor
              id="novel-description"
              name="description"
              defaultValue={novel?.description ?? ""}
              placeholder="A short synopsis…"
              className="min-h-[18rem] lg:min-h-[22rem]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {isEdit && novel ? (
            <div className={cn(panelClass, "flex items-center justify-between gap-4")}>
              {submitButton}
              <DeleteNovelButton novelId={novel.id} title={novel.title} />
            </div>
          ) : null}

          <div className={cn(panelClass, "flex flex-col gap-4")}>
            <fieldset className="flex flex-col gap-2">
              <legend className={labelClass}>Genres</legend>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((genre) => (
                  <label
                    key={genre}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
                  >
                    <input
                      type="checkbox"
                      name="genres"
                      value={genre}
                      defaultChecked={novel?.genres.includes(genre)}
                      className="size-3.5 accent-accent"
                    />
                    {genre}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="novel-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="novel-status"
                  name="status"
                  defaultValue={novel?.status ?? "ongoing"}
                  className={inputClass}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="novel-language" className={labelClass}>
                  Original language
                </label>
                <select
                  id="novel-language"
                  name="language"
                  defaultValue={novel?.language ?? "Chinese"}
                  className={inputClass}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="novel-tags" className={labelClass}>
                Tags{" "}
                <span className="font-normal opacity-60">(comma-separated)</span>
              </label>
              <input
                id="novel-tags"
                name="tags"
                defaultValue={novel?.tags.join(", ") ?? ""}
                placeholder="cultivation, slow burn, strong lead"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="novel-novelupdates-url" className={labelClass}>
                NovelUpdates link{" "}
                <span className="font-normal opacity-60">(optional)</span>
              </label>
              <input
                id="novel-novelupdates-url"
                name="novelupdatesUrl"
                type="url"
                defaultValue={novel?.novelupdates_url ?? ""}
                placeholder="https://www.novelupdates.com/series/..."
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
