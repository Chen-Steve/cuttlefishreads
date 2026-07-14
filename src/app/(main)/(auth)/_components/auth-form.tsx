"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import type { AuthState } from "../actions";

interface Field {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  link?: { href: string; label: string };
}

function PasswordInput({
  id,
  name,
  autoComplete,
  placeholder,
  value,
  onChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id: string;
  name: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="h-11 w-full rounded-xl border border-border bg-background px-3.5 pr-11 text-base text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {visible ? (
          <EyeOff className="size-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <Eye className="size-4" strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthForm({
  title,
  subtitle,
  fields,
  submitLabel,
  footerPrompt,
  footerHref,
  footerLinkLabel,
  action,
  hiddenFields,
  googleAction,
  googleRedirectTo,
  showLegalNotice = false,
}: {
  title: string;
  subtitle: string;
  fields: Field[];
  submitLabel: string;
  footerPrompt: string;
  footerHref: string;
  footerLinkLabel: string;
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  hiddenFields?: Record<string, string>;
  googleAction?: (redirectTo?: string) => Promise<void>;
  googleRedirectTo?: string;
  /** Show age / Terms acceptance line (signup). */
  showLegalNotice?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {}
  );

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, ""]))
  );

  function setField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
          {hiddenFields &&
            Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={field.name}
                  className="text-sm font-medium text-foreground"
                >
                  {field.label}
                </label>
                {field.link ? (
                  <Link
                    href={field.link.href}
                    className="text-xs font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {field.link.label}
                  </Link>
                ) : null}
              </div>

              {field.type === "password" ? (
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(v) => setField(field.name, v)}
                  aria-invalid={state.error ? true : undefined}
                  aria-describedby={
                    state.error
                      ? "auth-form-error"
                      : state.message
                        ? "auth-form-status"
                        : undefined
                  }
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                  aria-invalid={state.error ? true : undefined}
                  aria-describedby={
                    state.error
                      ? "auth-form-error"
                      : state.message
                        ? "auth-form-status"
                        : undefined
                  }
                  className="h-11 rounded-xl border border-border bg-background px-3.5 text-base text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              )}
            </div>
          ))}

          {state.error ? (
            <p
              id="auth-form-error"
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400"
            >
              {state.error}
            </p>
          ) : null}

          {state.message ? (
            <p
              id="auth-form-status"
              role="status"
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-400"
            >
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Please wait…" : submitLabel}
          </button>
        </form>

        {googleAction ? (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form action={googleAction.bind(null, googleRedirectTo)}>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </form>
          </>
        ) : null}

        {showLegalNotice ? (
          <p className="mt-4 text-center text-xs leading-relaxed text-muted">
            By creating an account you confirm you are at least 18 and agree to
            our{" "}
            <Link
              href="/terms"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Terms
            </Link>
            ,{" "}
            <Link
              href="/privacy"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
            , and{" "}
            <Link
              href="/guidelines"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Community Guidelines
            </Link>
            .
          </p>
        ) : null}

      <p className="mt-6 text-center text-sm text-muted">
        {footerPrompt}{" "}
        <Link
          href={footerHref}
          className="font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {footerLinkLabel}
        </Link>
      </p>
    </section>
  );
}
