import localFont from "next/font/local";

export const nationalPark = localFont({
  src: [
    {
      path: "../../public/fonts/woff2/NationalPark-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/woff2/NationalPark-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/woff2/NationalPark-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/woff2/NationalPark-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/woff2/NationalPark-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/woff2/NationalPark-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/woff2/NationalPark-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-national-park",
  display: "swap",
});
