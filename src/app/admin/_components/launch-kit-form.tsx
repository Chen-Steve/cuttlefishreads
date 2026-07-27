"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  updateLaunchKit,
  type LaunchKitState,
} from "../actions";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const textareaClass =
  "min-h-[6.5rem] w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelClass = "text-xs font-medium text-muted";
const panelClass = "rounded-2xl border border-border bg-surface p-5 sm:p-6";

function CopyField({
  id,
  label,
  value,
  hint,
}: {
  id: string;
  label: string;
  value: string | null;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          readOnly
          value={value ?? ""}
          placeholder={value ? undefined : "Set a username in your account first"}
          className={cn(inputClass, "min-w-0 flex-1 font-mono text-xs sm:text-sm")}
        />
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          aria-label={`Copy ${label}`}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden />
          ) : (
            <Copy className="size-4" strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

function GraphicField({
  id,
  label,
  hint,
  currentUrl,
  file,
  onFileChange,
  aspectClass,
}: {
  id: string;
  label: string;
  hint: string;
  currentUrl: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  aspectClass: string;
}) {
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  const display = preview ?? currentUrl;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg border border-border bg-background ring-1 ring-black/5 dark:ring-white/10",
          aspectClass,
        )}
      >
        {display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={display} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center px-3 text-center text-xs text-muted/70">
            No graphic yet
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          name={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/*"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="block min-w-0 flex-1 text-transparent text-xs file:mr-0 file:rounded-lg file:border-0 file:bg-accent file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-accent-foreground hover:file:bg-accent-hover"
        />
        {currentUrl ? (
          <a
            href={currentUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface"
          >
            <Download className="size-3.5" strokeWidth={1.75} aria-hidden />
            Download
          </a>
        ) : null}
      </div>
      {file ? (
        <span className="text-[0.7rem] leading-tight text-muted">
          Selected: {file.name}
        </span>
      ) : (
        <span className="text-[0.7rem] leading-tight text-muted">{hint}</span>
      )}
    </div>
  );
}

export function LaunchKitForm({
  novelId,
  links,
  initial,
}: {
  novelId: string;
  links: {
    creatorProfileLink: string | null;
    storyLink: string;
    defaultReferralLink: string;
  };
  initial: {
    shortAnnouncement: string;
    longAnnouncement: string;
    squareGraphicUrl: string | null;
    verticalGraphicUrl: string | null;
    referralUrl: string;
    launchDate: string;
  };
}) {
  const [squareFile, setSquareFile] = useState<File | null>(null);
  const [verticalFile, setVerticalFile] = useState<File | null>(null);
  const [referralOverride, setReferralOverride] = useState(
    initial.referralUrl || links.defaultReferralLink,
  );
  const [referralCopied, setReferralCopied] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);
  const [longCopied, setLongCopied] = useState(false);
  const shareReferralLink =
    referralOverride.trim() || links.defaultReferralLink;

  const boundAction = updateLaunchKit.bind(
    null,
    novelId,
    squareFile,
    verticalFile,
  );
  const [state, action, pending] = useActionState<LaunchKitState, FormData>(
    boundAction,
    {},
  );

  useEffect(() => {
    if (!referralCopied) return;
    const t = window.setTimeout(() => setReferralCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [referralCopied]);

  useEffect(() => {
    if (!shortCopied) return;
    const t = window.setTimeout(() => setShortCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [shortCopied]);

  useEffect(() => {
    if (!longCopied) return;
    const t = window.setTimeout(() => setLongCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [longCopied]);

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-400"
        >
          {state.message}
        </p>
      ) : null}

      <div className={cn(panelClass, "flex flex-col gap-4")}>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Links
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Copy these into posts, emails, and partner kits.
          </p>
        </div>

        <CopyField
          id="creator-profile-link"
          label="Creator profile link"
          value={links.creatorProfileLink}
        />
        <CopyField
          id="story-link"
          label="Story link"
          value={links.storyLink}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="referral-url" className={labelClass}>
            Referral link
          </label>
          <div className="flex gap-2">
            <input
              id="referral-url"
              name="referralUrl"
              type="url"
              inputMode="url"
              value={referralOverride}
              onChange={(e) => setReferralOverride(e.target.value)}
              placeholder={links.defaultReferralLink}
              className={cn(inputClass, "min-w-0 flex-1")}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareReferralLink);
                  setReferralCopied(true);
                } catch {
                  setReferralCopied(false);
                }
              }}
              aria-label="Copy referral link"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {referralCopied ? (
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden />
              ) : (
                <Copy className="size-4" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </div>
          <span className="text-xs text-muted">
            Defaults to your story link with a ref tag. Clear the field to use
            the default.
          </span>
        </div>
      </div>

      <div className={cn(panelClass, "flex flex-col gap-4")}>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Announcement copy
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Short for social posts; long for newsletters and press.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="short-announcement" className={labelClass}>
              Short announcement copy
            </label>
            <button
              type="button"
              onClick={async () => {
                const el = document.getElementById(
                  "short-announcement",
                ) as HTMLTextAreaElement | null;
                const text = el?.value?.trim() ?? "";
                if (!text) return;
                try {
                  await navigator.clipboard.writeText(text);
                  setShortCopied(true);
                } catch {
                  setShortCopied(false);
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              {shortCopied ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
              ) : (
                <Copy className="size-3.5" strokeWidth={1.75} />
              )}
              Copy
            </button>
          </div>
          <textarea
            id="short-announcement"
            name="shortAnnouncement"
            defaultValue={initial.shortAnnouncement}
            maxLength={500}
            placeholder="A punchy 1–2 sentence teaser for social posts."
            className={cn(textareaClass, "min-h-[5rem]")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="long-announcement" className={labelClass}>
              Long announcement copy
            </label>
            <button
              type="button"
              onClick={async () => {
                const el = document.getElementById(
                  "long-announcement",
                ) as HTMLTextAreaElement | null;
                const text = el?.value?.trim() ?? "";
                if (!text) return;
                try {
                  await navigator.clipboard.writeText(text);
                  setLongCopied(true);
                } catch {
                  setLongCopied(false);
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              {longCopied ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
              ) : (
                <Copy className="size-3.5" strokeWidth={1.75} />
              )}
              Copy
            </button>
          </div>
          <textarea
            id="long-announcement"
            name="longAnnouncement"
            defaultValue={initial.longAnnouncement}
            maxLength={4000}
            placeholder="A fuller blurb with premise, tone, and why readers should start now."
            className={cn(textareaClass, "min-h-[10rem]")}
          />
        </div>
      </div>

      <div className={cn(panelClass, "flex flex-col gap-4")}>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Graphics & date
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Upload promo assets sized for feeds and stories.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <GraphicField
            id="squareGraphic"
            label="Square cover graphic"
            hint="1:1 — leave empty to keep current."
            currentUrl={initial.squareGraphicUrl}
            file={squareFile}
            onFileChange={setSquareFile}
            aspectClass="aspect-square max-w-56"
          />
          <GraphicField
            id="verticalGraphic"
            label="Vertical mobile graphic"
            hint="9:16 — leave empty to keep current."
            currentUrl={initial.verticalGraphicUrl}
            file={verticalFile}
            onFileChange={setVerticalFile}
            aspectClass="aspect-[9/16] max-w-40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="launch-date" className={labelClass}>
            Launch date
          </label>
          <input
            id="launch-date"
            name="launchDate"
            type="date"
            defaultValue={initial.launchDate}
            className={cn(inputClass, "max-w-xs")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
      >
        {pending ? "Saving…" : "Save launch kit"}
      </button>
    </form>
  );
}
