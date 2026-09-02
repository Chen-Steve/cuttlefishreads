/** Public GA4 measurement ID (gtag.js). Keep in sync with the property used by the Data API. */
export const GA_MEASUREMENT_ID = "G-LJ3SXGLR01";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Runs before gtag.js loads. Analytics is always on. */
export function gtagInitScript(measurementId: string): string {
  return `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${measurementId}');
`.trim();
}
