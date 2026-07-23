"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { User } from "lucide-react";

import { getCroppedAvatarFile } from "@/lib/crop-avatar";
import { removeAvatar, updateAvatar, type AvatarState } from "../actions";

export function AvatarForm({
  currentAvatarUrl,
}: {
  currentAvatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const zoomId = useId();

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("avatar.jpg");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [state, setState] = useState<AvatarState>({});
  const [uploading, startUpload] = useTransition();
  const [removing, startRemove] = useTransition();

  const busy = uploading || removing;

  const closeCropper = useCallback(() => {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  useEffect(() => {
    if (!cropSrc) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !uploading) closeCropper();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cropSrc, uploading, closeCropper]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function onFileSelected(file: File | null) {
    setState({});
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({ error: "Profile picture must be an image file." });
      return;
    }

    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setSourceName(file.name || "avatar.jpg");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function confirmCrop() {
    if (!cropSrc || !croppedAreaPixels) return;

    startUpload(async () => {
      try {
        const file = await getCroppedAvatarFile(
          cropSrc,
          croppedAreaPixels,
          sourceName,
        );
        const result = await updateAvatar(file, {}, new FormData());
        setState(result);
        if (result.message) closeCropper();
      } catch {
        setState({ error: "Could not crop image. Please try another photo." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-label="Change profile picture"
          className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-accent/10 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {currentAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentAvatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center">
              <User className="size-5 text-accent" strokeWidth={1.75} aria-hidden />
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id="account-avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            disabled={busy}
            onChange={(event) => {
              onFileSelected(event.target.files?.[0] ?? null);
            }}
            className="sr-only"
          />

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="font-semibold text-accent transition-colors hover:text-accent-hover disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            {currentAvatarUrl ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setState({});
                  startRemove(async () => {
                    const result = await removeAvatar();
                    setState(result);
                  });
                }}
                className="font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
              >
                {removing ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          role="status"
          className="text-xs text-emerald-700 dark:text-emerald-400"
        >
          {state.message}
        </p>
      ) : null}

      {cropSrc ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !uploading) {
              closeCropper();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2
                id={titleId}
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Crop photo
              </h2>
              <button
                type="button"
                disabled={uploading}
                onClick={closeCropper}
                className="text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
              >
                Cancel
              </button>
            </div>

            <div className="relative aspect-square w-full bg-background">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="flex flex-col gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor={zoomId}
                  className="shrink-0 text-xs font-medium text-muted"
                >
                  Zoom
                </label>
                <input
                  id={zoomId}
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  disabled={uploading}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-[var(--accent)] disabled:opacity-60"
                />
              </div>

              <button
                type="button"
                disabled={uploading || !croppedAreaPixels}
                onClick={confirmCrop}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
