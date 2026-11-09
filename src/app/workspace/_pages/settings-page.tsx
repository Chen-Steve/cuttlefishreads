import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getWorkspaceSettings } from "@/lib/data/workspace";
import { SupportLinksForm } from "../_components/support-links-form";

export async function WorkspaceSettingsPage() {
  const access = await getAdminAccess();
  if (!access) notFound();

  const roleNoun = "translator";

  const profile = await getWorkspaceSettings(access);

  return (
    <PageContainer as="div" width="prose">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Settings
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        Set your default {roleNoun} message and support links for chapter
        pages.
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
            globalNote: profile.globalNote,
            kofiUrl: profile.kofiUrl,
            patreonUrl: profile.patreonUrl,
          }}
        />
      </div>
    </PageContainer>
  );
}
