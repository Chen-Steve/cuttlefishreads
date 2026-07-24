import { redirect } from "next/navigation";

/** Author applications are retired — anyone can start writing immediately. */
export default function ApplyAuthorRedirectPage() {
  redirect("/workspace");
}
