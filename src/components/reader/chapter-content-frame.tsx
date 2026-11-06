"use client";

import type { MouseEvent, ReactNode, SyntheticEvent } from "react";

import { useReaderSettings } from "@/hooks/use-reader-settings";
import { readerContentStyle } from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

const PARAGRAPH_HIT = "footnote-paragraph-hit";

function preventCopy(event: SyntheticEvent) {
  event.preventDefault();
}

function footnoteReturnParagraph(root: HTMLElement, link: Element): HTMLElement | null {
  const raw = link.getAttribute("href");
  if (!raw || !raw.startsWith("#")) return null;
  let id = raw.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  const anchor = document.getElementById(id);
  const paragraph = anchor?.closest("p");
  if (!(paragraph instanceof HTMLElement) || !root.contains(paragraph)) return null;
  return paragraph;
}

function revealThrough(root: HTMLElement, paragraph: HTMLElement) {
  const paragraphs = root.querySelectorAll(":scope > p:not([hidden])");
  for (const node of paragraphs) {
    if (!(node instanceof HTMLElement)) continue;
    node.style.contentVisibility = "visible";
    if (node === paragraph) break;
  }
  void root.offsetHeight;
}

function highlightFootnoteParagraph(root: HTMLElement, paragraph: HTMLElement) {
  for (const node of root.querySelectorAll(`p.${PARAGRAPH_HIT}`)) {
    if (node !== paragraph) node.classList.remove(PARAGRAPH_HIT);
  }
  paragraph.classList.add(PARAGRAPH_HIT);
  revealThrough(root, paragraph);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  paragraph.scrollIntoView({
    block: "center",
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

function onChapterClick(event: MouseEvent<HTMLDivElement>) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const source = event.target;
  if (!(source instanceof Element)) return;
  const link = source.closest("a[href^='#cf-fnref-']");
  if (!link || !event.currentTarget.contains(link)) return;
  const paragraph = footnoteReturnParagraph(event.currentTarget, link);
  if (!paragraph) return;
  event.preventDefault();
  highlightFootnoteParagraph(event.currentTarget, paragraph);
}

export function ChapterContentFrame({ children }: { children: ReactNode }) {
  const { settings } = useReaderSettings();
  const style = readerContentStyle(settings);
  const padded = settings.background !== "default";

  return (
    <div
      data-chapter-prose
      className={cn(
        "chapter-prose flex flex-col select-none",
        padded && "rounded-xl px-4 py-5 sm:px-6 sm:py-6",
      )}
      style={style}
      onClick={onChapterClick}
      onCopy={preventCopy}
      onCut={preventCopy}
      onContextMenu={preventCopy}
      onDragStart={preventCopy}
    >
      {children}
    </div>
  );
}
