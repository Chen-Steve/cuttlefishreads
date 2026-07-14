import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { publicPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = publicPageMetadata({
  title: "Refund Policy",
  description: `Refund and purchase policy for Cookies and digital content on ${SITE.name}.`,
  path: "/refund",
});

export default function RefundPage() {
  return (
    <PageContainer width="prose">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Refund Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: July 14, 2026
        </p>

        <Section title="1. Overview">
          <p>
            {SITE.name} sells digital virtual currency (&quot;Cookies&quot;)
            used to unlock premium chapters and related features. Because Cookies
            are delivered immediately to your account as digital goods, all sales
            are generally final.
          </p>
          <p>
            This policy supplements our{" "}
            <Link
              href="/terms"
              className="text-accent underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>
            . Payment processing is handled by third parties such as PayPal or
            Stripe; their terms may also apply to the payment itself.
          </p>
        </Section>

        <Section title="2. Nature of Cookies">
          <ul>
            <li>
              Cookies are a limited license to use features on {SITE.name}. They
              are not real money, gift cards, or stored-value instruments.
            </li>
            <li>
              Cookies have no cash value outside the Service and cannot be
              transferred between accounts, sold, or redeemed for currency except
              where required by law.
            </li>
            <li>
              Unlocking a chapter spends Cookies from your balance. Spent Cookies
              are not returned if you later stop reading that chapter or novel.
            </li>
          </ul>
        </Section>

        <Section title="3. All Sales Final">
          <p>
            Except as described below or required by applicable law, Cookie
            purchases are non-refundable once payment succeeds and Cookies are
            credited to your account. This includes unused Cookies remaining in
            your balance.
          </p>
        </Section>

        <Section title="4. Exceptions">
          <p>We may, at our sole discretion, issue a refund or credit when:</p>
          <ul>
            <li>
              You were charged more than once for the same purchase due to a
              technical error on our side.
            </li>
            <li>
              Cookies were not credited after a successful payment, and we cannot
              resolve the issue by delivering the Cookies.
            </li>
            <li>
              Applicable consumer law in your jurisdiction requires a refund.
            </li>
          </ul>
          <p>
            Buying the wrong package, changing your mind, unused balances,
            account bans for Terms violations, or dissatisfaction with a novel
            or chapter are not grounds for a refund.
          </p>
        </Section>

        <Section title="5. How to Request a Review">
          <p>
            If you believe your purchase qualifies for an exception, contact us
            through our{" "}
            <a
              href={SITE.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              Discord community
            </a>{" "}
            within fourteen (14) days of the purchase and include:
          </p>
          <ul>
            <li>The email address on your {SITE.name} account.</li>
            <li>Date and approximate time of the purchase.</li>
            <li>Payment method and transaction / order ID if available.</li>
            <li>A brief description of the problem.</li>
          </ul>
          <p>
            We may ask for additional information to verify the purchase. Filing
            a chargeback or payment dispute without first contacting us may delay
            resolution and can result in suspension of your account while we
            investigate.
          </p>
        </Section>

        <Section title="6. Chargebacks">
          <p>
            If you initiate a chargeback or payment dispute for a completed
            purchase, we may suspend Cookie spending and related features on your
            account until the dispute is resolved. If a chargeback is upheld, we
            may reverse the corresponding Cookies (and any unlocks funded by
            them) and take further action under our Terms of Service.
          </p>
        </Section>

        <Section title="7. Changes">
          <p>
            We may update this Refund Policy from time to time. The &quot;Last
            updated&quot; date at the top of this page will change when we do.
            Continued purchases after an update constitute acceptance of the
            revised policy for those purchases.
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
