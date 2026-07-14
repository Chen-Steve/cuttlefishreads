import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { publicPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = publicPageMetadata({
  title: "Privacy Policy",
  description: `Read the privacy policy for ${SITE.name} to understand how we collect, use, and protect your data.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <PageContainer width="prose">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: July 14, 2026
        </p>

        <Section title="1. Introduction">
          <p>
            Welcome to {SITE.name} (&quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;). We are committed to protecting your personal
            information and your right to privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when
            you visit our website and use our services.
          </p>
          <p>
            Please read this policy carefully. If you disagree with its terms,
            please discontinue use of the site. Our{" "}
            <Link
              href="/terms"
              className="text-accent underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>{" "}
            also apply to your use of {SITE.name}.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We may collect the following types of information:</p>
          <ul>
            <li>
              <strong>Account information:</strong> When you register, we collect
              your email address and a username you choose.
            </li>
            <li>
              <strong>Profile data:</strong> Information you voluntarily provide
              when updating your profile, such as a display name or public
              translator details.
            </li>
            <li>
              <strong>Reading activity:</strong> Progress data (e.g., chapters
              read, library bookmarks) so we can restore your place across
              devices.
            </li>
            <li>
              <strong>User content:</strong> Comments and other materials you
              choose to post on the Service.
            </li>
            <li>
              <strong>Usage data:</strong> Standard server logs including IP
              address, browser type, pages visited, and referring URLs. This data
              is used for site security, abuse prevention, and performance.
            </li>
            <li>
              <strong>Payment data:</strong> If you purchase Cookies, payment is
              processed by our third-party payment providers (such as PayPal or
              Stripe). We receive limited transaction details needed to credit
              your account. We do not store your full card details.
            </li>
            <li>
              <strong>Communications:</strong> Messages you send us for support
              or applications (for example, translator applications).
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Save and synchronise your reading progress and library.</li>
            <li>Process Cookie purchases and maintain your balance.</li>
            <li>Display public profile information you choose to share.</li>
            <li>Moderate comments and enforce our Community Guidelines.</li>
            <li>Respond to your inquiries and support requests.</li>
            <li>
              Send transactional emails (e.g., password reset, email
              verification). We do not send marketing emails without your
              explicit consent.
            </li>
            <li>Monitor and improve the security and performance of the site.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="4. Sharing Your Information">
          <p>
            We do not sell, trade, or rent your personal information to third
            parties. We may share data with:
          </p>
          <ul>
            <li>
              <strong>Service providers:</strong> Trusted vendors (e.g., hosting,
              authentication, payment processing, analytics) who assist in
              operating the site. They are obligated to use your data only to
              provide services to us.
            </li>
            <li>
              <strong>Public display:</strong> Username and content you post
              publicly (such as comments or a public profile) are visible to
              others.
            </li>
            <li>
              <strong>Legal requirements:</strong> We may disclose information if
              required to do so by law or in response to valid requests by public
              authorities.
            </li>
          </ul>
        </Section>

        <Section title="5. Cookies and Similar Technologies">
          <p>
            We use cookies and similar technologies for essential site functions
            and limited analytics:
          </p>
          <ul>
            <li>
              <strong>Essential cookies:</strong> Keep you signed in, protect
              against abuse, and remember preferences needed for the Service to
              work.
            </li>
            <li>
              <strong>Analytics:</strong> We may use privacy-conscious analytics
              (for example, aggregated page-view statistics) to understand which
              novels and pages are popular and to improve the Service.
            </li>
          </ul>
          <p>
            You can instruct your browser to refuse or delete cookies; however,
            some parts of the site (including signing in) may not function
            correctly without essential cookies. We do not use cookies to sell
            your personal information.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your personal data for as long as your account is active or
            as needed to provide services. You may request deletion of your
            account and associated data by contacting us. We will fulfil such
            requests within a reasonable timeframe, subject to legal obligations,
            dispute resolution, and records we must keep for security or
            accounting (for example, purchase history).
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We implement industry-standard security measures including encrypted
            connections (HTTPS) and secure credential storage. No method of
            transmission over the internet is 100% secure, and we cannot
            guarantee absolute security.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            {SITE.name} is intended for adults. You must be at least 18 years old
            to use the Service. We do not knowingly collect personal information
            from anyone under 18. If you believe a minor has provided us with
            personal data, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of material changes by updating the &quot;Last updated&quot; date
            at the top of this page. Continued use of the site after changes are
            posted constitutes your acceptance of the revised policy.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>
            If you have questions or concerns about this Privacy Policy, please
            contact us through our{" "}
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
