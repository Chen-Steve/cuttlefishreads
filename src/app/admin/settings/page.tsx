import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { SupportLinksForm } from "../_components/support-links-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const access = await getAdminAccess();
  if (!access?.hasWorkspace) notFound();

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("translator_note, kofi_url, patreon_url")
    .eq("id", access.userId)
    .maybeSingle();

  return (
    <PageContainer as="div" width="prose">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Settings
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        Set your default translator message and support links for chapter pages.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Translator note
        </h2>
        <p className="mb-5 mt-0.5 text-sm text-muted">
          Chapters set to &ldquo;Use global message&rdquo; show this note above
          their comments, along with your support links.
        </p>

        <SupportLinksForm
          initial={{
            globalNote: profile?.translator_note ?? null,
            kofiUrl: profile?.kofi_url ?? null,
            patreonUrl: profile?.patreon_url ?? null,
          }}
        />
      </div>
    </PageContainer>
  );
}
