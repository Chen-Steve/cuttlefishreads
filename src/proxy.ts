import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import {
  ANALYTICS_CONSENT_REGION_COOKIE,
  requiresAnalyticsConsentForGeo,
} from "@/lib/analytics-consent";

/** Marks EU/EEA/UK/CH or California via a first-party cookie for Consent Mode. */
function withAnalyticsConsentRegionCookie(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const needs = requiresAnalyticsConsentForGeo(
    request.headers.get("x-vercel-ip-country"),
    request.headers.get("x-vercel-ip-country-region"),
  );

  if (needs) {
    response.cookies.set(ANALYTICS_CONSENT_REGION_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
  } else if (request.cookies.has(ANALYTICS_CONSENT_REGION_COOKIE)) {
    response.cookies.set(ANALYTICS_CONSENT_REGION_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

export async function proxy(request: NextRequest) {
  return withAnalyticsConsentRegionCookie(
    request,
    await updateSession(request),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
