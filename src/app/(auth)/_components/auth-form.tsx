import Link from "next/link";

interface Field {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  link?: { href: string; label: string };
}

export function AuthForm({
  title,
  subtitle,
  fields,
  submitLabel,
  footerPrompt,
  footerHref,
  footerLinkLabel,
}: {
  title: string;
  subtitle: string;
  fields: Field[];
  submitLabel: string;
  footerPrompt: string;
  footerHref: string;
  footerLinkLabel: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-2xl border border-border bg-surface px-5 py-7 shadow-sm sm:px-8 sm:py-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>

        <form className="mt-6 flex flex-col gap-4">
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
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>
          ))}

          <button
            type="submit"
            className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {submitLabel}
          </button>
        </form>
      </div>

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
