/**
 * Client + middleware shared analytics consent helpers (no next/headers).
 */

export const ANALYTICS_CONSENT_STORAGE_KEY = "cf-analytics-consent";

/** Set by proxy from Vercel geo — marks EU/EEA/UK/CH or California. */
export const ANALYTICS_CONSENT_REGION_COOKIE = "cf-analytics-consent-region";

export type AnalyticsConsent = "granted" | "denied";

/**
 * EEA + UK + Switzerland — regions where analytics cookies typically need
 * prior consent under ePrivacy / GDPR-style rules.
 */
const CONSENT_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IT",
  "LV",
  "LI",
  "LT",
  "LU",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "GB",
  "CH",
]);

export function requiresAnalyticsConsentForGeo(
  country: string | null | undefined,
  region: string | null | undefined,
): boolean {
  const cc = country?.trim().toUpperCase();
  if (!cc) return false;
  if (CONSENT_COUNTRIES.has(cc)) return true;
  if (cc === "US" && region?.trim().toUpperCase() === "CA") return true;
  return false;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Runs before gtag.js loads. Uses the region cookie from proxy:
 * consent regions default to denied (then apply stored choice);
 * everyone else configures GA normally.
 */
export function analyticsConsentInitScript(measurementId: string): string {
  return `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
(function(){
  var needs=document.cookie.split(';').some(function(c){return c.trim().indexOf('${ANALYTICS_CONSENT_REGION_COOKIE}=1')===0;});
  if(needs){
    gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
    try{
      var s=localStorage.getItem('${ANALYTICS_CONSENT_STORAGE_KEY}');
      if(s==='granted'||s==='denied'){
        gtag('consent','update',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:s});
      }
    }catch(e){}
  }
  gtag('js',new Date());
  gtag('config','${measurementId}');
})();
`.trim();
}

export function applyAnalyticsConsent(consent: AnalyticsConsent): void {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // private mode — still update gtag for this session
  }

  if (typeof window.gtag !== "function") return;

  window.gtag("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: consent,
  });
}

export function readStoredAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (value === "granted" || value === "denied") return value;
  } catch {
    // ignore
  }
  return null;
}

export function isAnalyticsConsentRegionCookiePresent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${ANALYTICS_CONSENT_REGION_COOKIE}=1`));
}
