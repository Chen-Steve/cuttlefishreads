import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminAccess } from "@/lib/access";
import { AdminNav } from "@/app/admin/_components/admin-nav";

export const metadata: Metadata = {
  title: {
    absolute: "Author Workspace",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthorWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Originals publishing is open — any signed-in account can write.
  const access = await getAdminAccess();

  if (!access) redirect("/login?redirect=%2Fworkspace");

  return (
    <div
      data-surface="originals"
      className="flex min-h-full flex-1 flex-col bg-background text-foreground [--accent:#2f5d56] [--accent-hover:#254a45] [--accent-foreground:#f4faf8] dark:[--accent:#7eb8ae] dark:[--accent-hover:#9bcdc5] dark:[--accent-foreground:#12201e]"
    >
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to main content
      </a>
      <main className="flex-1">
        <AdminNav
          isMasterAdmin={access.isMasterAdmin}
          canSwitchWorkspace={access.isMasterAdmin || access.isTranslator}
        />
        <div id="workspace-content" tabIndex={-1}>
          {children}
        </div>
      </main>
    </div>
  );
}
