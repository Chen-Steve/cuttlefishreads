import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client for trusted server code only (e.g. crediting
// coins after a verified PayPal payment). It bypasses RLS and can execute
// SECURITY DEFINER functions, so it must NEVER be imported into client code.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)."
    );
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
