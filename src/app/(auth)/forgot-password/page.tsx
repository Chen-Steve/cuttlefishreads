import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthForm
      action={requestPasswordReset}
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new password."
      fields={[
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
          placeholder: "you@example.com",
        },
      ]}
      submitLabel="Send reset link"
      footerPrompt="Remembered it?"
      footerHref="/login"
      footerLinkLabel="Back to sign in"
    />
  );
}
