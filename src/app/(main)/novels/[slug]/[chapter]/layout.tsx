import { readerFontVariables } from "@/lib/reader-fonts";

export default function ChapterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={readerFontVariables}>{children}</div>;
}
