import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./test-helpers.mjs";

const { countChapterWords } = loadTs("./chapter-words.ts");
const { prepareChapterFootnotes } = loadTs("./footnotes.ts");

test("countChapterWords matches the database whitespace split", () => {
  assert.equal(countChapterWords(""), 0);
  assert.equal(countChapterWords("   \n\t  "), 0);
  assert.equal(countChapterWords("Hello"), 1);
  assert.equal(countChapterWords("Hello world"), 2);
  assert.equal(countChapterWords("  Hello   world\n\nagain  "), 3);
  assert.equal(countChapterWords("**bold** _italic_"), 2);
  assert.equal(countChapterWords("[^1: a note] trailing"), 4);
});

test("inline footnotes normalize for the editor preview", () => {
  const { paragraphs, footnotes } = prepareChapterFootnotes([
    "Hello [^1: a note] world.",
  ]);
  assert.equal(footnotes.length, 1);
  assert.equal(footnotes[0].label, "1");
  assert.equal(footnotes[0].content, "a note");
  assert.equal(paragraphs[0], "Hello [^1] world.");
});
