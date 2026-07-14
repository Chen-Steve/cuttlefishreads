import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const updateSession = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          // Prevent CDNs/proxies from caching responses that set auth cookies,
          // which would otherwise leak one user's session to another.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and getClaims().
  // A simple mistake could make it very hard to debug issues with users
  // being randomly logged out. getClaims() validates the JWT signature and
  // refreshes the auth token when needed.
  await supabase.auth.getClaims()

  // IMPORTANT: Return the supabaseResponse object as it is. If you create a
  // new response, make sure to copy over the cookies and the request headers.
  return supabaseResponse
};
