import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthForm } from "../_components/auth-form";
import { confirmPasswordReset } from "../actions";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/password-recovery";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getClaims();
  const hasRecovery = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === "1";

  if (!data?.claims || !hasRecovery) {
    redirect("/forgot-password");
  }

  return (
    <AuthForm
      action={confirmPasswordReset}
      title="Choose a new password"
      subtitle="Enter a new password for your account."
      fields={[
        {
          name: "password",
          label: "New password",
          type: "password",
          autoComplete: "new-password",
          placeholder: "At least 6 characters",
        },
        {
          name: "confirmPassword",
          label: "Confirm password",
          type: "password",
          autoComplete: "new-password",
          placeholder: "Repeat new password",
        },
      ]}
      submitLabel="Update password"
      footerPrompt="Remembered it?"
      footerHref="/login"
      footerLinkLabel="Back to sign in"
    />
  );
}
