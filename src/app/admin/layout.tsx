import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect("/login");
  if (!isAdminEmail(data.claims.email as string | undefined)) notFound();

  return <main className="flex-1">{children}</main>;
}
