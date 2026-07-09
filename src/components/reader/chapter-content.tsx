import type { ReactNode } from "react";

const inlineMarkdownPattern = /(\*\*.+?\*\*|\+\+.+?\+\+|_[^_]+?_)/g;

export function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(inlineMarkdownPattern).map((part, index) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index}>{renderInlineMarkdown(part.slice(2, -2))}</strong>
      );
    }

    if (part.length > 4 && part.startsWith("++") && part.endsWith("++")) {
      return <u key={index}>{renderInlineMarkdown(part.slice(2, -2))}</u>;
    }

    if (part.length > 2 && part.startsWith("_") && part.endsWith("_")) {
      return <em key={index}>{renderInlineMarkdown(part.slice(1, -1))}</em>;
    }

    return part;
  });
}

export function splitTextParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\n+/)
    .map((paragraph) => paragraph.replace(/\s+$/, ""))
    .filter((paragraph) => paragraph.trim().length > 0);
}

export function ChapterContent({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-5 text-base leading-7 text-foreground/90 sm:text-[1.05rem] sm:leading-8">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>
          {renderInlineMarkdown(paragraph)}
        </p>
      ))}
    </div>
  );
}
