import { Suspense } from "react";
import { AdultContentWarning } from "@/components/novel/adult-content-warning";
import { getNovel } from "@/lib/data";

export default function NovelSlugLayout({
  children,
  params,
}: LayoutProps<"/novels/[slug]">) {
  return (
    <>
      <Suspense fallback={null}>
        <NovelAdultWarning params={params} />
      </Suspense>
      {children}
    </>
  );
}

async function NovelAdultWarning({
  params,
}: {
  params: LayoutProps<"/novels/[slug]">["params"];
}) {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel?.genres.includes("Adult")) return null;
  return <AdultContentWarning />;
}
