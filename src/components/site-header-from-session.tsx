import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { SITE } from "@/lib/constants";
import { getSessionProfile } from "@/lib/session-profile";

export async function SiteHeaderFromSession() {
  const session = await getSessionProfile();
  if (!session) {
    return <SiteHeader />;
  }

  return (
    <SiteHeader
      isAuthenticated
      username={session.username}
      avatarUrl={session.avatarUrl}
      coins={session.coins}
      isTranslator={session.isTranslator}
      isMasterAdmin={session.isAdmin}
      unreadNotifications={session.unreadNotifications}
    />
  );
}

/** Same chrome as SiteHeader so streaming the auth header does not shift layout. */
export function SiteHeaderFallback() {
  return (
    <header className="overflow-visible border-b border-border bg-background">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 overflow-visible px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${SITE.name} home`}
          className="relative z-0 inline-flex h-9 shrink-0 items-center overflow-hidden rounded-lg outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent sm:overflow-visible"
        >
          <span className="relative flex h-9 w-12 shrink-0 items-center overflow-hidden sm:overflow-visible">
            <Image
              src="/cuttle.png"
              alt=""
              width={24}
              height={24}
              className="pointer-events-none absolute top-1/2 left-0 h-9 w-auto -translate-y-1/2 object-contain sm:h-32"
              priority
              aria-hidden
            />
          </span>
          <span className="ml-2 hidden items-center sm:flex">
            <span className="text-lg font-semibold leading-none tracking-tight text-foreground md:text-xl">
              {SITE.name}
            </span>
          </span>
        </Link>

        <div className="mx-auto hidden min-w-0 w-full max-w-md flex-1 sm:block">
          <div className="h-9 w-full rounded-full border border-border bg-surface" />
        </div>

        <div className="pointer-events-none min-w-0 flex-1 sm:hidden" />

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1" aria-hidden>
          <span className="hidden h-9 w-16 rounded-xl bg-surface sm:block" />
          <span className="size-10 rounded-xl bg-surface sm:size-9" />
        </div>
      </div>
    </header>
  );
}
