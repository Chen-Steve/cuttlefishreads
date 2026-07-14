import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
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
          Last updated: July 14, 2026
        </p>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using {SITE.name} (the &quot;Service&quot;), you
            agree to be bound by these Terms of Service (&quot;Terms&quot;). If
            you do not agree to these Terms, please do not use the Service.
          </p>
          <p>
            These Terms incorporate our{" "}
            <InlineLink href="/privacy">Privacy Policy</InlineLink>,{" "}
            <InlineLink href="/refund">Refund Policy</InlineLink>,{" "}
            <InlineLink href="/guidelines">Community Guidelines</InlineLink>,
            and <InlineLink href="/dmca">DMCA Policy</InlineLink>. We reserve
            the right to update these Terms at any time. Continued use of the
            Service after updates are posted constitutes acceptance of the
            revised Terms.
          </p>
        </Section>

        <Section title="2. Eligibility and Age">
          <p>
            You must be at least 18 years old to create an account, purchase
            Cookies, or use the Service. By using the Service, you represent that
            you are at least 18 and that all information you provide is accurate
            and complete.
          </p>
          <p>
            The Service may include mature, sexual, or otherwise adult-oriented
            fiction (including works tagged Adult, Smut, or similar). You agree
            that you are of legal age to view such content in your jurisdiction
            and that you will not allow minors to access your account or the
            Service through you.
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
              these Terms or our Community Guidelines.
            </li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          <p>
            You agree to follow our{" "}
            <InlineLink href="/guidelines">Community Guidelines</InlineLink> and
            not to:
          </p>
          <ul>
            <li>
              Use the Service for any unlawful purpose or in violation of any
              applicable laws.
            </li>
            <li>
              Post, upload, or distribute content that is infringing, defamatory,
              harassing, or otherwise prohibited by our guidelines.
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
              Circumvent paywalls, unlock restrictions, or share account access
              to avoid paying for content.
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

        <Section title="5. User Content">
          <p>
            The Service may allow you to submit comments, replies, messages, or
            other materials (&quot;User Content&quot;). You retain ownership of
            your User Content, but you grant {SITE.name} a worldwide,
            non-exclusive, royalty-free, transferable license to host, store,
            display, reproduce, and distribute that User Content in connection
            with operating and promoting the Service.
          </p>
          <ul>
            <li>
              You are solely responsible for your User Content and represent that
              you have all rights needed to post it and that it does not violate
              these Terms, our Community Guidelines, or any law.
            </li>
            <li>
              We may remove, edit, or refuse to display User Content at our
              discretion, including content that is abusive, spam, off-topic, or
              infringing.
            </li>
            <li>
              User Content reflects the views of the person who posted it and
              does not necessarily represent the views of {SITE.name}.
            </li>
            <li>
              We are not obligated to monitor User Content, but we may do so to
              enforce these Terms and protect users.
            </li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
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
            over underlying source material. Copyright complaints are handled
            under our <InlineLink href="/dmca">DMCA Policy</InlineLink>.
          </p>
        </Section>

        <Section title="7. Translators and Published Works">
          <p>
            Translators and other publishers who submit novels or chapters to the
            Service (&quot;Publishers&quot;) represent and warrant that:
          </p>
          <ul>
            <li>
              They have all rights, licenses, and permissions necessary to
              publish the submitted material on {SITE.name}, including rights to
              the translation and authority to use the underlying work as
              required by law and any applicable licenses.
            </li>
            <li>
              Their submissions do not infringe the intellectual property,
              privacy, or other rights of any third party.
            </li>
            <li>
              They will promptly notify us if they lose the right to continue
              distributing any work they published on the Service.
            </li>
          </ul>
          <p>
            By publishing on the Service, Publishers grant {SITE.name} a
            worldwide, non-exclusive, royalty-free license to host, display,
            distribute, promote, and make the submitted works available to users
            (including unlocking paid chapters) for as long as those works remain
            on the Service. Removal of a work from the Service does not affect
            licenses already granted for user unlocks or archival copies we keep
            as needed for legal, security, or operational purposes.
          </p>
          <p>
            {SITE.name} may edit metadata, covers, or presentation for clarity
            and site standards, suspend or remove works that appear to violate
            these Terms or third-party rights, and share revenue with Publishers
            according to any separate agreement or program terms then in effect.
          </p>
        </Section>

        <Section title="8. Virtual Currency (Cookies) and Purchases">
          <ul>
            <li>
              {SITE.name} offers a virtual currency (&quot;Cookies&quot;) that
              can be used to unlock premium chapters and related features.
            </li>
            <li>
              Cookies are a limited license to use digital features on the
              Service. They have no cash value outside the Service and cannot be
              transferred, traded, or redeemed for real currency except where
              required by applicable law.
            </li>
            <li>
              Purchases are processed by third-party payment providers (such as
              PayPal or Stripe). Their terms also apply to the payment
              transaction.
            </li>
            <li>
              We reserve the right to modify Cookie pricing, package sizes,
              availability, and redemption options at any time.
            </li>
            <li>
              Cookies in your account may be forfeited if your account is
              terminated for a violation of these Terms.
            </li>
          </ul>
          <p>
            Refunds, chargebacks, and purchase disputes are governed by our{" "}
            <InlineLink href="/refund">Refund Policy</InlineLink>.
          </p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p>
            The Service is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, express or implied,
            including but not limited to warranties of merchantability, fitness
            for a particular purpose, or non-infringement. We do not warrant that
            the Service will be uninterrupted, error-free, or free of viruses, or
            that translations or other content will be accurate or complete.
          </p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, {SITE.name} and its
            operators shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of or
            inability to use the Service, even if we have been advised of the
            possibility of such damages. Our total liability for any claim
            arising out of these Terms or the Service shall not exceed the
            greater of (a) the amount you paid us for Cookies in the twelve (12)
            months before the claim or (b) fifty US dollars (US $50), except
            where prohibited by law.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            We may suspend or terminate your access to the Service at any time,
            with or without notice, for conduct that we believe violates these
            Terms, our Community Guidelines, or is harmful to other users, us, or
            third parties. You may also request account deletion by contacting
            us. Provisions that by their nature should survive termination
            (including intellectual property, disclaimers, and limitations of
            liability) will survive.
          </p>
        </Section>

        <Section title="12. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with
            applicable law. Any disputes arising under these Terms shall be
            subject to the exclusive jurisdiction of the competent courts in the
            applicable jurisdiction.
          </p>
        </Section>

        <Section title="13. Contact Us">
          <p>
            If you have questions about these Terms of Service, please contact us
            through our{" "}
            <a
              href={SITE.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              Discord community
            </a>
            .
          </p>
        </Section>
      </article>
    </PageContainer>
  );
}

function InlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-accent underline-offset-2 hover:underline"
    >
      {children}
    </Link>
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
