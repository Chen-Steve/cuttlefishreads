import { SITE } from "@/lib/constants";

type SiteMailbox = "legal" | "contact";

const MAILBOXES: Record<SiteMailbox, string> = {
  legal: SITE.legalEmail,
  contact: SITE.contactEmail,
};

export function SiteEmailLink({
  mailbox,
  subject,
}: {
  mailbox: SiteMailbox;
  subject?: string;
}) {
  const email = MAILBOXES[mailbox];
  const href = subject
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${email}`;

  return (
    <a
      href={href}
      className="font-semibold text-accent underline-offset-2 hover:underline"
    >
      {email}
    </a>
  );
}
