import type { Metadata } from "next";
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
          Last updated: June 6, 2026
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
            please discontinue use of the site.
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
              when updating your profile, such as a display name.
            </li>
            <li>
              <strong>Reading activity:</strong> Progress data (e.g., chapters
              read, library bookmarks) so we can restore your place across
              devices.
            </li>
            <li>
              <strong>Usage data:</strong> Standard server logs including IP
              address, browser type, pages visited, and referring URLs. This data
              is used solely for site security and performance.
            </li>
            <li>
              <strong>Payment data:</strong> If you purchase coins, payment is
              processed by our third-party payment provider. We do not store your
              full card details.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Save and synchronise your reading progress and library.</li>
            <li>Process coin purchases and maintain your balance.</li>
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
              authentication, payment processing) who assist in operating the
              site. They are contractually obligated to keep your data
              confidential.
            </li>
            <li>
              <strong>Legal requirements:</strong> We may disclose information if
              required to do so by law or in response to valid requests by public
              authorities.
            </li>
          </ul>
        </Section>

        <Section title="5. Cookies">
          <p>
            We use cookies and similar tracking technologies to maintain your
            session (login state) and remember preferences. You can instruct your
            browser to refuse all cookies; however, some parts of the site may
            not function correctly without them.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your personal data for as long as your account is active or
            as needed to provide services. You may request deletion of your
            account and associated data by contacting us. We will fulfil such
            requests within a reasonable timeframe, subject to legal obligations.
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
            {SITE.name} is not directed to children under the age of 13. We do
            not knowingly collect personal information from children under 13. If
            you believe a child has provided us with personal data, please contact
            us and we will delete it promptly.
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
            contact us through the site&apos;s contact channels.
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
