import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { publicPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = publicPageMetadata({
  title: "Terms of Service",
  description: `Read the terms of service for ${SITE.name} to understand your rights and responsibilities when using our platform.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <PageContainer width="prose">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: June 6, 2026
        </p>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using {SITE.name} (the &quot;Service&quot;), you
            agree to be bound by these Terms of Service (&quot;Terms&quot;). If
            you do not agree to these Terms, please do not use the Service.
          </p>
          <p>
            We reserve the right to update these Terms at any time. Continued use
            of the Service after updates are posted constitutes acceptance of the
            revised Terms.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 13 years old to use the Service. By using the
            Service, you represent that you meet this age requirement and that all
            information you provide is accurate and complete.
          </p>
        </Section>

        <Section title="3. User Accounts">
          <ul>
            <li>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity that occurs under your
              account.
            </li>
            <li>
              You must notify us immediately of any unauthorised use of your
              account.
            </li>
            <li>
              You may not create accounts for others without their consent or use
              another person&apos;s account.
            </li>
            <li>
              We reserve the right to suspend or terminate accounts that violate
              these Terms.
            </li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>
              Use the Service for any unlawful purpose or in violation of any
              applicable laws.
            </li>
            <li>
              Post, upload, or distribute content that is infringing, defamatory,
              obscene, or otherwise objectionable.
            </li>
            <li>
              Attempt to gain unauthorised access to any part of the Service or
              its related systems.
            </li>
            <li>
              Scrape, crawl, or otherwise systematically extract content from the
              Service without our express written permission.
            </li>
            <li>
              Interfere with or disrupt the integrity or performance of the
              Service.
            </li>
            <li>
              Impersonate any person or entity, or falsely represent your
              affiliation with a person or entity.
            </li>
          </ul>
        </Section>

        <Section title="5. Intellectual Property">
          <p>
            All content on {SITE.name} — including but not limited to novel
            translations, chapter text, images, logos, and site design — is owned
            by or licensed to {SITE.name} and is protected by applicable
            intellectual property laws.
          </p>
          <p>
            You may read content for personal, non-commercial use only. You may
            not reproduce, republish, distribute, or create derivative works from
            any content without our express written permission.
          </p>
          <p>
            Original works (raw source texts) remain the property of their
            respective authors and publishers. {SITE.name} claims no ownership
            over underlying source material.
          </p>
        </Section>

        <Section title="6. Virtual Currency (Coins)">
          <ul>
            <li>
              {SITE.name} may offer a virtual currency (&quot;Coins&quot;) that
              can be used to unlock premium chapters.
            </li>
            <li>
              Coins have no monetary value and cannot be refunded, transferred,
              or exchanged for real currency except where required by applicable
              law.
            </li>
            <li>
              We reserve the right to modify Coin pricing, availability, and
              redemption at any time.
            </li>
            <li>
              Coins in your account may be forfeited if your account is
              terminated for a violation of these Terms.
            </li>
          </ul>
        </Section>

        <Section title="7. Disclaimer of Warranties">
          <p>
            The Service is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, express or implied,
            including but not limited to warranties of merchantability, fitness
            for a particular purpose, or non-infringement. We do not warrant that
            the Service will be uninterrupted, error-free, or free of viruses.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, {SITE.name} and its
            operators shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of or
            inability to use the Service, even if we have been advised of the
            possibility of such damages.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            We may suspend or terminate your access to the Service at any time,
            with or without notice, for conduct that we believe violates these
            Terms or is harmful to other users, us, or third parties. You may
            also delete your account at any time through your account settings.
          </p>
        </Section>

        <Section title="10. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with
            applicable law. Any disputes arising under these Terms shall be
            subject to the exclusive jurisdiction of the competent courts in the
            applicable jurisdiction.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            If you have questions about these Terms of Service, please contact us
            through the site&apos;s contact channels.
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
  children: React.ReactNode;
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
