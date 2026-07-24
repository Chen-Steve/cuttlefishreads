import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";

import { OriginalsPublicProfile } from "@/app/(originals)/_components/originals-public-profile";
import { ORIGINALS } from "@/lib/constants";
import { getPublicProfile } from "@/lib/data";
import {
  creatorPublicOrigin,
  getSiteSurface,
  originalsPublicUrl,
  resolveRequestHost,
} from "@/lib/hosts";
import { getUserOriginalSeries } from "@/lib/originals-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const profile = await getPublicProfile(subdomain);
  return {
    title: profile ? `${profile.username} - ${ORIGINALS.shortName}` : "Creator page",
    robots: { index: false, follow: false },
  };
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const profile = await getPublicProfile(subdomain);

  if (!profile) {
    notFound();
  }

  const originalSeries = await getUserOriginalSeries(profile.id);
  const host = resolveRequestHost((await headers()).get("host"));
  const isVanitySubdomain = getSiteSurface(host).surface === "creator";
  const isAuthor = originalSeries.length > 0;

  if (!isVanitySubdomain) {
    permanentRedirect(
      isAuthor
        ? creatorPublicOrigin(profile.username)
        : originalsPublicUrl(`/profiles/${profile.username}`),
    );
  }

  if (!isAuthor) notFound();

  return (
    <OriginalsPublicProfile
      profile={profile}
      originalSeries={originalSeries}
    />
  );
}
