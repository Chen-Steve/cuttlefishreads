import { AdultContentWarning } from "@/components/novel/adult-content-warning";
import { getNovel } from "@/lib/data";

export default async function NovelSlugLayout({
  children,
  params,
}: LayoutProps<"/novels/[slug]">) {
  const { slug } = await params;
  const novel = await getNovel(slug);
  const showWarning = novel?.genres.includes("Adult") ?? false;

  return (
    <>
      {showWarning ? <AdultContentWarning /> : null}
      {children}
    </>
  );
}
