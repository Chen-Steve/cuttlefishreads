import type { Metadata } from "next";

import { WorkspaceLaunchKitPage } from "@/app/admin/_pages/launch-kit-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthorLaunchKitPage() {
  return <WorkspaceLaunchKitPage workspace="originals" />;
}
