import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";
import { signup, signInWithGoogle } from "../actions";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  const safeRedirect =
    redirectTo?.startsWith("/") ? redirectTo : undefined;

  return (
    <AuthForm
      action={signup}
      hiddenFields={safeRedirect ? { redirectTo: safeRedirect } : undefined}
      title="Create your account"
      subtitle={
        safeRedirect === "/apply"
          ? "Create a free account and you'll be taken straight to the translator application."
          : "Start your shelf and follow the stories you love."
      }
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
      googleAction={signInWithGoogle}
      googleRedirectTo={safeRedirect}
      showLegalNotice
    />
  );
}
