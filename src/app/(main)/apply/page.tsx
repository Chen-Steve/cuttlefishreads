import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { PageContainer } from "@/components/page-container";
import { createClient } from "@/utils/supabase/server";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Apply to translate",
};

type ApplicationRow = {
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const STATUS_COPY: Record<ApplicationRow["status"], { title: string; body: string; tone: string }> = {
  pending: {
    title: "Application under review",
    body: "Your application is in the queue. We'll reach out on Discord if it's approved.",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  approved: {
    title: "You're a translator!",
    body: "Your application was approved. Head to your workspace to start uploading novels.",
    tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
  rejected: {
    title: "Application not approved",
    body: "Unfortunately this application wasn't approved. Reach out on Discord if you have questions.",
    tone: "border-red-500/30 bg-red-500/10 text-red-600",
  },
};

export default async function ApplyPage() {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return (
      <PageContainer as="section" width="narrow">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Become a translator
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Want to bring novels to Cuttlefish Reads? Approved translators get
          their own workspace to upload and manage novels, plus a stats
          dashboard.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-sm font-medium text-foreground">
            You need an account to apply.
          </p>
          <p className="mt-1 text-sm text-muted">
            Create a free account first — it only takes a moment. Once you&apos;re
            signed up you&apos;ll be dropped straight back here.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/signup?redirect=/apply"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Create an account
            </Link>
            <Link
              href="/login?redirect=/apply"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Sign in
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const userId = data.claims.sub as string;
  const email = (data.claims.email as string | undefined) ?? "";

  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("username, role").eq("id", userId).maybeSingle(),
    supabase
      .from("translator_applications")
      .select("status, created_at")
      .eq("user_id", userId)
      .maybeSingle<ApplicationRow>(),
  ]);

  return (
    <PageContainer as="section" width="narrow">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Become a translator
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Want to bring novels to Cuttlefish Reads? Tell us a little about yourself.
        Approved translators get their own workspace to upload and manage novels,
        plus a dashboard to track views, bookmarks, and purchases.
      </p>

      {application ? (
        <div className={`mt-8 rounded-xl border px-5 py-5 text-sm ${STATUS_COPY[application.status].tone}`}>
          <p className="font-semibold">{STATUS_COPY[application.status].title}</p>
          <p className="mt-1 opacity-90">{STATUS_COPY[application.status].body}</p>
          {application.status === "approved" && (
            <Link
              href="/admin"
              className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Go to workspace
            </Link>
          )}
        </div>
      ) : profile?.role === "translator" ? (
        <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-5 text-sm text-emerald-700">
          <p className="font-semibold">You&apos;re already a translator.</p>
          <Link
            href="/admin"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Go to workspace
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <ApplyForm username={profile?.username ?? ""} email={email} />
        </div>
      )}
    </PageContainer>
  );
}
