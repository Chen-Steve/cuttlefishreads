import { redirect } from "next/navigation";

/** Overall Stats was removed for originals — use per-novel stats instead. */
export default function AuthorDashboardRedirect() {
  redirect("/workspace");
}
