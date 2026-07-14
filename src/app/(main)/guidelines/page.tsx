import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { publicPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = publicPageMetadata({
  title: "Community Guidelines",
  description: `Community guidelines for comments, Discord, and conduct on ${SITE.name}.`,
  path: "/guidelines",
});

export default function GuidelinesPage() {
  return (
    <PageContainer width="prose">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Community Guidelines
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: July 14, 2026
        </p>

        <Section title="1. Purpose">
          <p>
            These Community Guidelines explain how we expect people to behave on{" "}
            {SITE.name} — including novel comments and related community spaces
            such as our Discord. They work together with our{" "}
            <Link
              href="/terms"
              className="text-accent underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>
            . Violations may lead to content removal, muted privileges, or
            account suspension.
          </p>
        </Section>

        <Section title="2. Be respectful">
          <ul>
            <li>
              Treat readers, translators, and staff with basic courtesy. Disagreement
              is fine; personal attacks are not.
            </li>
            <li>
              Do not harass, threaten, stalk, or dogpile other users.
            </li>
            <li>
              Do not share someone else&apos;s private information (doxxing),
              including real names, addresses, or private messages, without their
              clear consent.
            </li>
          </ul>
        </Section>

        <Section title="3. Keep discussions on-topic">
          <ul>
            <li>
              Novel comments should relate to the story, translation, or reading
              experience. Off-topic spam, advertising, and repeated low-effort
              posts may be removed.
            </li>
            <li>
              Spoilers for later chapters should be marked when practical, and
              you should not spoil other novels in unrelated threads.
            </li>
            <li>
              Do not use comments to request or share pirated copies, raw dumps,
              or links that bypass {SITE.name}&apos;s unlock system.
            </li>
          </ul>
        </Section>

        <Section title="4. Prohibited content">
          <p>Do not post or share:</p>
          <ul>
            <li>
              Content that exploits or sexualizes minors (anyone 17 or under),
              fictional or otherwise.
            </li>
            <li>
              Illegal content, or content that promotes violent crime, terrorism,
              or real-world harm.
            </li>
            <li>
              Hate speech targeting people based on protected characteristics.
            </li>
            <li>
              Malware, phishing links, or scams.
            </li>
            <li>
              Impersonation of staff, translators, or other users.
            </li>
          </ul>
          <p>
            Mature themes may appear in novels on the Service. That does not mean
            harassment, illegal sexual content, or real-world abuse is allowed in
            community spaces.
          </p>
        </Section>

        <Section title="5. Translators and creators">
          <ul>
            <li>
              Critique of a translation or story is allowed; targeted harassment
              of a translator is not.
            </li>
            <li>
              Do not falsely claim authorship or publisher status for works you
              did not create or are not authorized to publish.
            </li>
            <li>
              Publishers must follow the translator and intellectual property
              rules in our Terms of Service and respond to valid copyright
              notices under our{" "}
              <Link
                href="/dmca"
                className="text-accent underline-offset-2 hover:underline"
              >
                DMCA Policy
              </Link>
              .
            </li>
          </ul>
        </Section>

        <Section title="6. Enforcement">
          <p>
            We may remove content, warn users, restrict commenting, or suspend
            accounts when we believe these guidelines or our Terms have been
            broken. We are not required to issue a warning first for serious
            violations. Decisions are made in good faith to keep the community
            usable; repeated or severe abuse may result in a permanent ban.
          </p>
        </Section>

        <Section title="7. Reporting">
          <p>
            If you see something that breaks these guidelines, contact us through
            our{" "}
            <a
              href={SITE.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              Discord community
            </a>{" "}
            with a link to the content and a short explanation. Copyright
            takedown requests should follow the{" "}
            <Link
              href="/dmca"
              className="text-accent underline-offset-2 hover:underline"
            >
              DMCA process
            </Link>
            , not this channel alone.
          </p>
        </Section>
      </article>
    </PageContainer>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_strong]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
