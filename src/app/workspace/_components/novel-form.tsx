"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TabPanelShell } from "@/components/tab-panel-shell";
import { GENRES, LANGUAGES } from "@/lib/constants";
import { prepareCoverFile } from "@/lib/prepare-cover";
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
  backHref,
}: {
  novel?: NovelFormValues;
  backHref: string;
}) {
  const isEdit = Boolean(novel);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverPreparing, setCoverPreparing] = useState(false);
  const localCoverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile],
  );

  useEffect(() => {
    return () => {
      if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    };
  }, [localCoverPreview]);

  const boundAction = isEdit
    ? updateNovel.bind(null, novel!.id)
    : createNovel;

  const [state, action, pending] = useActionState<AdminState, FormData>(
    boundAction,
    {},
  );

  const displayCover = localCoverPreview ?? novel?.cover_url ?? null;
  const displayError = coverError ?? state.error;
  const submitDisabled = pending || coverPreparing;
  const submitLabel = coverPreparing
    ? "Processing cover…"
    : pending
      ? isEdit
        ? "Saving…"
        : "Creating…"
      : isEdit
        ? "Save changes"
        : "Create novel";

  async function onCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selected = input.files?.[0] ?? null;
    setCoverError(null);
    if (!selected) {
      setCoverFile(null);
      return;
    }

    setCoverPreparing(true);
    try {
      const prepared = await prepareCoverFile(selected);
      const dt = new DataTransfer();
      dt.items.add(prepared);
      input.files = dt.files;
      setCoverFile(prepared);
    } catch (err) {
      input.value = "";
      setCoverFile(null);
      setCoverError(
        err instanceof Error
          ? err.message
          : "Could not process that cover image.",
      );
    } finally {
      setCoverPreparing(false);
    }
  }

  return (
    <form action={action}>
      <TabPanelShell
        leftTab={
          <Link
            href={backHref}
            className="inline-flex h-9 items-center gap-1 px-4 text-sm font-medium text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
            Back to novels
          </Link>
        }
        rightTab={
          <button
            type="submit"
            disabled={submitDisabled}
            className="inline-flex h-9 items-center justify-center px-4 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        }
      >
        <div className="flex min-w-0 items-center gap-3 px-4 pt-2">
          <h1 className="shrink-0 text-sm font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit novel" : "Create novel"}
          </h1>
          <label htmlFor="novel-title" className="sr-only">
            Title
          </label>
          <input
            id="novel-title"
            name="title"
            required
            defaultValue={novel?.title}
            placeholder="Title"
            className={`${inputClass} h-9 min-w-0 flex-1`}
          />
        </div>

        {displayError ? (
          <p
            role="alert"
            className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
          >
            {displayError}
          </p>
        ) : null}

        <div className="grid items-start gap-4 px-4 pb-4 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[7.5rem_1fr] sm:items-start">
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
                  onChange={onCoverChange}
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
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
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

            {isEdit && novel ? (
              <DeleteNovelButton novelId={novel.id} title={novel.title} />
            ) : null}
          </aside>
        </div>
      </TabPanelShell>
    </form>
  );
}
