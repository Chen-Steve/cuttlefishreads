import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NotificationsList } from "@/components/notifications/notifications-list";
import { PageContainer } from "@/components/page-container";
import { getNotifications } from "@/lib/notifications/data";
import { getAuthClaims } from "@/utils/supabase/auth";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Replies, likes, and new chapters from your library.",
};

export default async function NotificationsPage() {
  const claims = await getAuthClaims();
  if (!claims) {
    redirect("/login?redirect=/notifications");
  }

  const notifications = await getNotifications(claims.sub as string);

  return (
    <PageContainer as="section" width="narrow" className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Notifications
          </h1>

        </div>
        <Link
          href="/account"
          className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-accent"
        >
          Account
        </Link>
      </div>

      <NotificationsList notifications={notifications} />
    </PageContainer>
  );
}
