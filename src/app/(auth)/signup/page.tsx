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
          ? "Please create an account to apply as a translator. After signup you'll continue to the application."
          : safeRedirect === "/workspace" ||
              safeRedirect === "/apply"
            ? "Please create an account to start writing. After signup you'll land in your author workspace."
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
