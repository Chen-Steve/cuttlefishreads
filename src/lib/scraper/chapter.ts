import * as cheerio from "cheerio";

export type ScrapedChapter = {
  /** Chapter title as printed on the source page (still in the source language). */
  title: string;
  /** Body paragraphs in reading order, source language, no HTML. */
  paragraphs: string[];
  /** Absolute URL of the next chapter, or null when the source says there is none. */
  nextUrl: string | null;
  /** The (possibly redirected) URL that was actually fetched. */
  finalUrl: string;
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Matches a chapter page like /xiaoshuo/9389101/82601102/ but NOT the book
// index /xiaoshuo/9389101/. We use this to know when the "next" link has
// looped back to the table of contents (i.e. there are no more chapters).
const CHAPTER_PATH_RE = /\/[A-Za-z]+\/\d+\/\d+\/?$/;

// Labels different mirrors use for the "next chapter" link.
const NEXT_LABELS = ["下一章", "下一頁", "下一页", "next", "下章"];

function looksLikeChapterUrl(url: string): boolean {
  try {
    return CHAPTER_PATH_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function cleanParagraph(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+/g, " ")
    .trim();
}

/**
 * Fetches a single chapter page and extracts its title, body, and the link to
 * the next chapter. Tuned for the wfxs.tw / micro-novel reader markup
 * (`h1.title`, `#read_conent_box`, and a `.page` nav with a "下一章" link) but
 * falls back to reasonable generic selectors.
 */
export async function scrapeChapter(url: string): Promise<ScrapedChapter> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Source returned HTTP ${res.status} for ${url}`);
  }

  const html = await res.text();
  const finalUrl = res.url || url;
  const $ = cheerio.load(html);

  const title =
    cleanParagraph($("h1.title").first().text()) ||
    cleanParagraph($("h1").first().text()) ||
    cleanParagraph($("title").first().text());

  const contentRoot = $("#read_conent_box").length
    ? $("#read_conent_box")
    : $(".entry").first();

  // Drop scripts/styles/ads that sometimes live inside the content node.
  contentRoot.find("script, style, ins, iframe, .ad, [id*='ad']").remove();

  let paragraphs = contentRoot
    .find("p")
    .map((_, el) => cleanParagraph($(el).text()))
    .get()
    .filter((p) => p.length > 0);

  // Fallback: some pages keep text as <br>-separated lines with no <p> tags.
  if (paragraphs.length === 0) {
    paragraphs = contentRoot
      .text()
      .split(/\n+/)
      .map(cleanParagraph)
      .filter((p) => p.length > 0);
  }

  // Find the "next chapter" link.
  let nextUrl: string | null = null;
  $(".page a, .chapter_pages a, a").each((_, el) => {
    if (nextUrl) return;
    const label = $(el).text().replace(/\s+/g, "").toLowerCase();
    if (NEXT_LABELS.some((l) => label.includes(l.toLowerCase()))) {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        nextUrl = new URL(href, finalUrl).toString();
      } catch {
        nextUrl = null;
      }
    }
  });

  // If the "next" link points back to the table of contents (no chapter id),
  // or points at the current page, treat it as the end of the novel.
  if (nextUrl && (!looksLikeChapterUrl(nextUrl) || nextUrl === finalUrl)) {
    nextUrl = null;
  }

  if (paragraphs.length === 0) {
    throw new Error(`Could not find any chapter text at ${url}`);
  }

  return { title, paragraphs, nextUrl, finalUrl };
}
