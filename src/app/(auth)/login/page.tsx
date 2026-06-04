import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      fields={[
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
          autoComplete: "current-password",
          placeholder: "••••••••",
          link: { href: "/forgot-password", label: "Forgot password?" },
        },
      ]}
      submitLabel="Sign in"
      footerPrompt="No account yet?"
      footerHref="/signup"
      footerLinkLabel="Create an account"
    />
  );
}
