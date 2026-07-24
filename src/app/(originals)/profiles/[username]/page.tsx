import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { OriginalsPublicProfile } from "@/app/(originals)/_components/originals-public-profile";
import { ORIGINALS } from "@/lib/constants";
import { getPublicProfile } from "@/lib/data";
import { creatorPublicOrigin } from "@/lib/hosts";
import { getUserOriginalSeries } from "@/lib/originals-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  return {
    title: profile
      ? `${profile.username} - ${ORIGINALS.shortName} profile`
      : "Profile not found",
    robots: { index: false, follow: false },
  };
}

export default async function OriginalsProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const originalSeries = await getUserOriginalSeries(profile.id);
  if (originalSeries.length > 0) {
    permanentRedirect(creatorPublicOrigin(profile.username));
  }

  return (
    <OriginalsPublicProfile
      profile={profile}
      originalSeries={originalSeries}
    />
  );
}
