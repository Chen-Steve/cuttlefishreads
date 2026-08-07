import type { Metadata } from "next";
import { cache } from "react";
import { redirect } from "next/navigation";

import { getAdminAccess } from "@/lib/access";
import { createAdminClient } from "@/utils/supabase/admin";
import { AdminNav } from "./_components/admin-nav";

export const metadata: Metadata = {
  title: {
    absolute: "Workspace",
  },
  robots: {
    index: false,
    follow: false,
  },
};

const hasOriginalNovel = cache(async (userId: string): Promise<boolean> => {
  const admin = createAdminClient();
  const { count } = await admin
    .from("novels")
    .select("id", { count: "exact", head: true })
    .eq("publisher_id", userId)
    .eq("publication_type", "original");
  return (count ?? 0) > 0;
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccess();

  if (!access) redirect("/login");
  // /admin is the translator workspace only. Originals writers use
  // /originals/workspace (open to any signed-in account).
  if (!access.isMasterAdmin && !access.isTranslator) {
    redirect("/apply");
  }

  // Only surface the Originals workspace switch once the translator has
  // actually published something there (master admins always see it).
  const canSwitchWorkspace =
    access.isMasterAdmin ||
    (access.isTranslator && (await hasOriginalNovel(access.userId)));

  return (
    <>
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to main content
      </a>
      <main className="flex-1">
        <AdminNav
          isMasterAdmin={access.isMasterAdmin}
          canSwitchWorkspace={canSwitchWorkspace}
        />
        <div id="workspace-content" tabIndex={-1}>
          {children}
        </div>
      </main>
    </>
  );
}
