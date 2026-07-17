"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { User } from "lucide-react";

import {
  removeAvatar,
  updateAvatar,
  type AvatarState,
} from "../actions";

export function AvatarForm({
  currentAvatarUrl,
}: {
  currentAvatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const localPreview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  );

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const boundAction = updateAvatar.bind(null, avatarFile);
  const [state, formAction, pending] = useActionState<AvatarState, FormData>(
    boundAction,
    {},
  );
  const [removeState, setRemoveState] = useState<AvatarState>({});
  const [removing, startRemove] = useTransition();

  useEffect(() => {
    if (state.message) {
      setAvatarFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [state.message]);

  const displayUrl = localPreview ?? currentAvatarUrl;
  const busy = pending || removing;
  const error = state.error ?? removeState.error;
  const message = state.message ?? removeState.message;

  return (
    <div className="flex flex-col gap-1.5">
      <form action={formAction} className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-label="Change profile picture"
          className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-accent/10 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="size-full object-cover" />
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
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            disabled={busy}
            onChange={(event) => {
              setRemoveState({});
              setAvatarFile(event.target.files?.[0] ?? null);
            }}
            className="sr-only"
          />

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            {avatarFile ? (
              <>
                <span className="truncate text-muted">{avatarFile.name}</span>
                <button
                  type="submit"
                  disabled={busy}
                  className="font-semibold text-accent transition-colors hover:text-accent-hover disabled:opacity-60"
                >
                  {pending ? "Uploading…" : "Upload"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAvatarFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="font-semibold text-accent transition-colors hover:text-accent-hover disabled:opacity-60"
                >
                  Change photo
                </button>
                {currentAvatarUrl ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setRemoveState({});
                      startRemove(async () => {
                        const result = await removeAvatar();
                        setRemoveState(result);
                        if (result.message) setAvatarFile(null);
                      });
                    }}
                    className="font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
                  >
                    {removing ? "Removing…" : "Remove"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </form>

      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      ) : null}
    </div>
  );
}
