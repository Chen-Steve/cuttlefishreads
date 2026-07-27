import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Rocket } from "lucide-react";

import { NovelCover } from "@/components/novel/novel-cover";
import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { WORKSPACE_BASE, type WorkspaceKind } from "@/lib/workspace";

type SeriesRow = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  status: string;
};

export async function WorkspaceLaunchKitPage({
  workspace,
}: {
  workspace: WorkspaceKind;
}) {
  if (workspace !== "originals") notFound();

  const access = await getAdminAccess();
  if (!access) notFound();

  const admin = createAdminClient();
  const base = WORKSPACE_BASE[workspace];

  let query = admin
    .from("novels")
    .select("id, title, slug, cover_url, status")
    .eq("publication_type", "original")
    .order("updated_at", { ascending: false });

  if (!access.isMasterAdmin) {
    query = query.eq("publisher_id", access.userId);
  }

  const { data } = await query.returns<SeriesRow[]>();
  const series = data ?? [];

  return (
    <PageContainer as="div" width="default">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        Launch Kit
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        Promo links, announcement copy, and graphics for each series launch.
      </p>

      {series.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
          Create a series first, then build its launch kit here.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {series.map((item) => (
            <li key={item.id}>
              <Link
                href={`${base}/novels/${item.id}/launch-kit`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-4"
              >
                <div className="w-12 shrink-0 sm:w-14">
                  <NovelCover
                    title={item.title}
                    slug={item.slug}
                    coverUrl={item.cover_url ?? undefined}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                    {item.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    <Rocket className="size-3.5" strokeWidth={1.75} aria-hidden />
                    <span className="capitalize">{item.status}</span>
                    <span aria-hidden>·</span>
                    <span>Open launch kit</span>
                  </p>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
