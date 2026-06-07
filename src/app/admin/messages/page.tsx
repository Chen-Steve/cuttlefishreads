import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMessagingBootstrap } from "@/lib/messaging";
import { MessagesApp } from "./_components/messages-app";

export const metadata: Metadata = {
  title: "Admin — Messages",
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const bootstrap = await getMessagingBootstrap();
  if (!bootstrap) notFound();

  return (
    <MessagesApp
      currentUserId={bootstrap.access.userId}
      isMasterAdmin={bootstrap.access.isMasterAdmin}
      members={bootstrap.members}
      initialChannels={bootstrap.channels}
      initialActiveChannelId={bootstrap.activeChannelId}
      initialMessages={bootstrap.messages}
    />
  );
}
