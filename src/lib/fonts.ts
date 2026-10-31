import localFont from "next/font/local";

/** Variable face, wght 200–800. One file covers regular through bold. */
export const nationalPark = localFont({
  src: "../../public/fonts/woff2/NationalPark-VariableVF.woff2",
  weight: "200 800",
  variable: "--font-national-park",
  display: "swap",
});
