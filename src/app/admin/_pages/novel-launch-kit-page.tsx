import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/page-container";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminAccess } from "@/lib/access";
import { creatorPublicOrigin, originalsPublicUrl } from "@/lib/hosts";
import {
  WORKSPACE_BASE,
  WORKSPACE_PUBLICATION_TYPE,
  type WorkspaceKind,
} from "@/lib/workspace";
import { LaunchKitForm } from "../_components/launch-kit-form";

type LaunchKitRow = {
  short_announcement: string | null;
  long_announcement: string | null;
  square_graphic_url: string | null;
  vertical_graphic_url: string | null;
  referral_url: string | null;
  launch_date: string | null;
};

export async function WorkspaceNovelLaunchKitPage({
  workspace,
  novelId,
}: {
  workspace: WorkspaceKind;
  novelId: string;
}) {
  if (workspace !== "originals") notFound();

  const access = await getAdminAccess();
  if (!access) notFound();

  const admin = createAdminClient();
  const base = WORKSPACE_BASE[workspace];

  const { data: novel } = await admin
    .from("novels")
    .select("id, title, slug, publisher_id, publication_type")
    .eq("id", novelId)
    .maybeSingle();

  if (!novel) notFound();
  if (!access.isMasterAdmin && novel.publisher_id !== access.userId) {
    notFound();
  }
  if (novel.publication_type !== WORKSPACE_PUBLICATION_TYPE[workspace]) {
    notFound();
  }

  const { data: kit } = await admin
    .from("novel_launch_kits")
    .select(
      "short_announcement, long_announcement, square_graphic_url, vertical_graphic_url, referral_url, launch_date",
    )
    .eq("novel_id", novelId)
    .maybeSingle<LaunchKitRow>();

  let creatorUsername = access.username;
  if (novel.publisher_id && novel.publisher_id !== access.userId) {
    const { data: owner } = await admin
      .from("profiles")
      .select("username")
      .eq("id", novel.publisher_id)
      .maybeSingle();
    creatorUsername = owner?.username ?? null;
  }

  const creatorProfileLink = creatorUsername
    ? creatorPublicOrigin(creatorUsername)
    : null;
  const storyLink = originalsPublicUrl(`/series/${novel.slug}`);
  const defaultReferralLink = creatorUsername
    ? `${storyLink}${storyLink.includes("?") ? "&" : "?"}ref=${encodeURIComponent(creatorUsername)}`
    : storyLink;

  return (
    <PageContainer as="div" width="prose">
      <Link
        href={`${base}/launch-kit`}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
        Back to Launch Kit
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
        Launch Kit
      </h1>
      <p className="mt-0.5 text-sm text-muted">{novel.title}</p>

      <div className="mt-6">
        <LaunchKitForm
          novelId={novel.id}
          links={{
            creatorProfileLink,
            storyLink,
            defaultReferralLink,
          }}
          initial={{
            shortAnnouncement: kit?.short_announcement ?? "",
            longAnnouncement: kit?.long_announcement ?? "",
            squareGraphicUrl: kit?.square_graphic_url ?? null,
            verticalGraphicUrl: kit?.vertical_graphic_url ?? null,
            referralUrl: kit?.referral_url ?? "",
            launchDate: kit?.launch_date ?? "",
          }}
        />
      </div>
    </PageContainer>
  );
}
