import {
  Inter,
  Literata,
  Lora,
  Merriweather,
  Noto_Sans,
  Open_Sans,
} from "next/font/google";

// Optional reader faces. `preload: false` so chapter pages do not download
// every family up front — the browser fetches only the selected font.
export const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
  preload: false,
});

export const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
});

export const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

export const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
  preload: false,
});

export const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
  preload: false,
});

export const readerFontVariables = [
  literata.variable,
  lora.variable,
  merriweather.variable,
  inter.variable,
  openSans.variable,
  notoSans.variable,
].join(" ");
