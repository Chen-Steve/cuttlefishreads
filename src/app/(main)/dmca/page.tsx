import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { SITE } from "@/lib/constants";
import { publicPageMetadata, siteUrl } from "@/lib/seo";

const siteHost = siteUrl.hostname;
const dmcaEmail = `dmca@${siteHost}`;

export const metadata: Metadata = publicPageMetadata({
  title: "DMCA",
  description: `DMCA copyright policy and takedown notice instructions for ${SITE.name}.`,
  path: "/dmca",
});

export default function DmcaPage() {
  return (
    <PageContainer width="prose">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          DMCA Policy
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: June 29, 2026</p>

        <Section title="Overview">
          <p>
            {SITE.name} is in compliance with 17 U.S.C. § 512 and the Digital
            Millennium Copyright Act (&quot;DMCA&quot;). It is our policy to
            respond to any infringement notices and take appropriate actions
            under the Digital Millennium Copyright Act (&quot;DMCA&quot;) and
            other applicable intellectual property laws.
          </p>
          <p>
            If your copyrighted material has been posted on {siteHost} or if
            links to your copyrighted material are returned through our search
            engine and you want this material removed, you must provide a written
            communication that details the information listed in the following
            section.
          </p>
        </Section>

        <Section title="Filing a DMCA takedown notice">
          <p>
            To be effective, your written notice must include all of the
            following information:
          </p>
          <ul>
            <li>
              A physical or electronic signature of a person authorized to act
              on behalf of the owner of an exclusive copyright that is allegedly
              infringed.
            </li>
            <li>
              Identification of the copyrighted work claimed to have been
              infringed, or — if multiple copyrighted works are covered by a
              single notification — a representative list of such works.
            </li>
            <li>
              Identification of the material that is claimed to be infringing or
              to be the subject of infringing activity, including information
              reasonably sufficient to permit us to locate the material (for
              example, the exact URL(s) on {siteHost} where the material
              appears).
            </li>
            <li>
              Your contact information, including your name, mailing address,
              telephone number, and email address.
            </li>
            <li>
              A statement that you have a good faith belief that use of the
              material in the manner complained of is not authorized by the
              copyright owner, its agent, or the law.
            </li>
            <li>
              A statement, made under penalty of perjury, that the information
              in the notification is accurate and that you are the copyright
              owner or are authorized to act on behalf of the owner of an
              exclusive right that is allegedly infringed.
            </li>
          </ul>
        </Section>

        <Section title="Where to send your notice">
          <p>
            Please send DMCA takedown notices to our designated copyright agent:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{" "}
              <a
                href={`mailto:${dmcaEmail}`}
                className="text-accent underline-offset-2 hover:underline"
              >
                {dmcaEmail}
              </a>
            </li>
            <li>
              <strong>Subject line:</strong> DMCA Takedown Notice
            </li>
          </ul>
          <p>
            We may also be reached through our{" "}
            <a
              href={SITE.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              Discord community
            </a>{" "}
            for general inquiries, but formal takedown requests should be sent
            by email so we can respond promptly and maintain a record of your
            notice.
          </p>
        </Section>

        <Section title="Our response">
          <p>
            Upon receipt of a valid DMCA notice, we will review the claim and,
            where appropriate, remove or disable access to the material
            identified as infringing. We may notify the user who posted the
            material and, when required by law, provide them with a copy of
            your notice (excluding personal contact details where permitted).
          </p>
          <p>
            Please note that submitting a false or bad-faith takedown notice
            may result in legal liability under 17 U.S.C. § 512(f).
          </p>
        </Section>

        <Section title="Counter-notification">
          <p>
            If you believe material you posted was removed or disabled by
            mistake or misidentification, you may submit a counter-notification
            to {dmcaEmail} that includes:
          </p>
          <ul>
            <li>Your physical or electronic signature.</li>
            <li>
              Identification of the material that was removed and its location
              before removal.
            </li>
            <li>
              A statement under penalty of perjury that you have a good faith
              belief the material was removed or disabled as a result of
              mistake or misidentification.
            </li>
            <li>
              Your name, address, telephone number, and a statement that you
              consent to the jurisdiction of the federal court in your district
              (or, if outside the United States, any judicial district in
              which {SITE.name} may be found) and that you will accept service
              of process from the person who submitted the original DMCA
              notice.
            </li>
          </ul>
        </Section>

        <Section title="Repeat infringers">
          <p>
            In appropriate circumstances, we may terminate the accounts of users
            who are repeat infringers of copyright or other intellectual property
            rights.
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
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_a]:text-accent [&_strong]:text-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
