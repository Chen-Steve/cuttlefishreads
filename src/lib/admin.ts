// Admin access is controlled by an env allowlist of emails. Set ADMIN_EMAILS
// to a comma-separated list (e.g. "me@example.com,editor@example.com").
// This stays server-side only — never expose it with a NEXT_PUBLIC_ prefix.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
