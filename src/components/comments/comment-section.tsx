import { LazyComments } from "./lazy-comments";

/** No comment queries or personalized data run during rendering/prefetch. */
export function CommentSection({
  mode,
  novelSlug,
  chapterNumber,
}: {
  mode: "novel" | "chapter";
  novelSlug: string;
  chapterNumber?: number;
}) {
  if (mode === "chapter" && chapterNumber == null) return null;
  return (
    <LazyComments
      key={`${novelSlug}:${mode}:${chapterNumber ?? "all"}`}
      mode={mode}
      novelSlug={novelSlug}
      chapterNumber={chapterNumber}
    />
  );
}
