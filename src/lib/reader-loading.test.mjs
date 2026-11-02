import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./test-helpers.mjs";

const { observeChapterProgress } = loadTs("./reader-prefetch.ts");

function readerBrowser(t) {
  const events = new Map();
  const frames = new Map();
  let nextFrame = 1;
  let resizeCallback;
  let disconnected = false;
  const state = { top: 100, height: 10000, proseReady: true, prefetches: 0 };
  const listen = (name, callback) => events.set(name, callback);
  const remove = (name) => events.delete(name);
  const browser = { innerHeight: 800, addEventListener: listen, removeEventListener: remove,
    requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); } };
  const document = { visibilityState: "visible", addEventListener: listen, removeEventListener: remove };
  const globals = { window: browser, document, ResizeObserver: class {
    constructor(callback) { resizeCallback = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  } };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  const container = { querySelector() { return state.proseReady ? { getBoundingClientRect: () => state } : null; } };
  const flush = () => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } };
  const cleanup = observeChapterProgress(container, () => { state.prefetches++; });
  return { state, document, events, frames, flush, cleanup, resize: () => resizeCallback(), disconnected: () => disconnected };
}

test("next chapter waits for 65% of the chapter, coalesces scrolls and only prefetches once", (t) => {
  const browser = readerBrowser(t);
  browser.flush();
  assert.equal(browser.state.prefetches, 0);
  browser.state.top = -5600; // 64% is visible/read: (800 + 5600) / 10000.
  for (let i = 0; i < 100; i++) browser.events.get("scroll")();
  assert.equal(browser.frames.size, 1);
  browser.flush();
  assert.equal(browser.state.prefetches, 0);
  browser.state.top = -5700;
  browser.events.get("scroll")(); browser.flush();
  assert.equal(browser.state.prefetches, 1);
  assert.equal(browser.events.size, 0);
  assert.equal(browser.disconnected(), true);
  browser.resize(); browser.flush();
  assert.equal(browser.state.prefetches, 1);
});

test("streaming, hidden tabs, resize and unmount cannot trigger premature prefetch", (t) => {
  const browser = readerBrowser(t);
  browser.state.proseReady = false;
  browser.state.height = 200;
  browser.flush();
  assert.equal(browser.state.prefetches, 0);
  browser.state.proseReady = true;
  browser.document.visibilityState = "hidden";
  browser.resize(); browser.flush();
  assert.equal(browser.state.prefetches, 0);
  browser.document.visibilityState = "visible";
  browser.events.get("visibilitychange")(); browser.flush();
  assert.equal(browser.state.prefetches, 1);
  browser.cleanup();
  assert.equal(browser.events.size, 0);
});

test("leaving a chapter cancels a pending progress check", (t) => {
  const browser = readerBrowser(t);
  browser.state.height = 200;
  browser.cleanup(); browser.flush();
  assert.equal(browser.frames.size, 0);
  assert.equal(browser.state.prefetches, 0);
});

test("initial chapter comments enforce access and never load a chapter list", async () => {
  const calls = [];
  let allowed = false;
  const { getCommentSectionData } = loadTs("./comment-section-data.ts", { "@/lib/data": {
    async getChapterComments(slug, number) { calls.push([slug, number]); if (!allowed) throw new Error("Unlock this chapter to read its comments."); return { comments: [], hasMore: false, nextCursor: null }; },
    getNovelComments() { throw new Error("Wrong scope"); },
    getChapterSummaries() { throw new Error("Chapter list should stay unloaded"); },
    isUserAuthenticated: async () => true,
  } });
  await assert.rejects(getCommentSectionData("story", 2), /Unlock this chapter/);
  allowed = true;
  assert.deepEqual(await getCommentSectionData("story", 2), {
    comments: [], hasMore: false, nextCursor: null, isLoggedIn: true, readableChapters: [], chapterTitles: {},
  });
  assert.deepEqual(calls, [["story", 2], ["story", 2]]);
});

test("initial novel comments load titles once and offer only readable chapter choices", async () => {
  let chapterLists = 0;
  const { getCommentSectionData } = loadTs("./comment-section-data.ts", { "@/lib/data": {
    getChapterComments() { throw new Error("Wrong scope"); },
    getNovelComments: async () => ({ comments: [], hasMore: false, nextCursor: null }),
    getChapterSummaries: async () => { chapterLists++; return [{ number: 1, title: "", locked: false }, { number: 2, title: "Paid", locked: true }]; },
    isUserAuthenticated: async () => true,
  } });
  const result = await getCommentSectionData("story");
  assert.equal(chapterLists, 1);
  assert.deepEqual(result.chapterTitles, { 1: "Chapter 1", 2: "Paid" });
  assert.deepEqual(result.readableChapters, [{ number: 1, title: "" }]);
});

test("lazy comments endpoint rejects malformed chapters and never caches personalized responses", async () => {
  const state = { exists: true, allowed: false, failure: false, calls: 0 };
  const { GET } = loadTs("../app/api/novels/[slug]/comments/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/data": { getNovel: async () => state.exists ? {} : null },
    "@/lib/comment-section-data": { getCommentSectionData: async (_slug, chapter) => {
      state.calls++;
      if (state.failure) throw new Error("Database offline");
      if (chapter != null && !state.allowed) throw new Error("Unlock this chapter to read its comments.");
      return { comments: [{ body: "Authorized comment" }] };
    } },
  });
  const get = (query = "") => GET(new Request(`https://example.com/api/novels/story/comments${query}`), { params: Promise.resolve({ slug: "story" }) });
  for (const chapter of ["", "0", "-1", "NaN", "2.5", "1e2", "9007199254740992"]) {
    assert.equal((await get(`?chapter=${chapter}`)).status, 400);
  }
  assert.equal(state.calls, 0);
  const denied = await get("?chapter=2");
  assert.equal(denied.status, 403);
  assert.ok(!(await denied.text()).includes("Authorized comment"));
  state.allowed = true;
  const buyer = await get("?chapter=2");
  assert.equal(buyer.status, 200);
  assert.equal(buyer.headers.get("cache-control"), "private, no-store");
  assert.equal(buyer.headers.get("vary"), "Cookie");
  state.allowed = false;
  assert.equal((await get("?chapter=2")).status, 403);
  state.exists = false;
  assert.equal((await get()).status, 404);
  state.exists = true; state.failure = true;
  const log = console.error; console.error = () => {};
  try { assert.equal((await get()).status, 500); } finally { console.error = log; }
});
