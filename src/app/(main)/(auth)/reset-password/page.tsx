import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";
import { confirmPasswordReset } from "../actions";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
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
