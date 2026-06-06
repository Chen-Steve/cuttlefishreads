import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";
import { login, signInWithGoogle } from "../actions";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  const safeRedirect =
    redirectTo?.startsWith("/") ? redirectTo : undefined;

  return (
    <AuthForm
      action={login}
      hiddenFields={safeRedirect ? { redirectTo: safeRedirect } : undefined}
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
      footerHref={safeRedirect ? `/signup?redirect=${encodeURIComponent(safeRedirect)}` : "/signup"}
      footerLinkLabel="Create an account"
      googleAction={signInWithGoogle}
      googleRedirectTo={safeRedirect}
    />
  );
}
