import {
  Inter,
  Literata,
  Lora,
  Merriweather,
  Noto_Sans,
  Open_Sans,
} from "next/font/google";

// Reader font choices, self-hosted via next/font. Each exposes a CSS
// variable that the reader settings map to.
export const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

export const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

export const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const readerFontVariables = [
  literata.variable,
  lora.variable,
  merriweather.variable,
  inter.variable,
  openSans.variable,
  notoSans.variable,
].join(" ");
