import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { ReviewButtons } from "./_components/review-buttons";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type ApplicationRow = {
  id: string;
  username: string;
  email: string;
  discord: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ApplicationsPage() {
  const access = await getAdminAccess();
  // Reviewing applications is master-admin only.
  if (!access?.isMasterAdmin) notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("translator_applications")
    .select("id, username, email, discord, message, status, created_at")
    .order("created_at", { ascending: false })
    .returns<ApplicationRow[]>();

  const applications = data ?? [];
  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");

  return (
    <PageContainer as="div">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Translator applications
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        {pending.length === 0
          ? "No pending applications"
          : `${pending.length} pending`}
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
            Nothing to review right now.
          </p>
        ) : (
          pending.map((app) => (
            <div
              key={app.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {app.username || "(no username)"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>{app.email}</span>
                    <span aria-hidden>·</span>
                    <span>Discord: {app.discord}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(app.created_at)}</span>
                  </p>
                </div>
                <ReviewButtons applicationId={app.id} />
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                {app.message}
              </p>
            </div>
          ))
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-foreground">Reviewed</h2>
          <div className="mt-3 flex flex-col gap-3">
            {reviewed.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {app.username || "(no username)"}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{app.email}</span>
                      <span aria-hidden>·</span>
                      <span>Discord: {app.discord}</span>
                      <span aria-hidden>·</span>
                      <span>{formatDate(app.created_at)}</span>
                    </p>
                  </div>
                  <span
                    className={
                      app.status === "approved"
                        ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600"
                        : "rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600"
                    }
                  >
                    {app.status}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                  {app.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
