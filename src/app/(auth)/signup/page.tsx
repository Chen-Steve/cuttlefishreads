import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";
import { signup } from "../actions";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  return (
    <AuthForm
      action={signup}
      title="Create your account"
      subtitle="Start your shelf and follow the stories you love."
      fields={[
        {
          name: "username",
          label: "Username",
          type: "text",
          autoComplete: "username",
          placeholder: "Fellow Daoist",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
          placeholder: "you@example.com",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "new-password",
          placeholder: "••••••••",
        },
        {
          name: "confirmPassword",
          label: "Confirm password",
          type: "password",
          autoComplete: "new-password",
          placeholder: "••••••••",
        },
      ]}
      submitLabel="Create account"
      footerPrompt="Already have an account?"
      footerHref="/login"
      footerLinkLabel="Sign in"
    />
  );
}
