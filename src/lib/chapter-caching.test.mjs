import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./test-helpers.mjs";

function fixture() {
  const novel = {
    id: "n1", slug: "story", title: "Story", genres: [], tags: [],
    status: "ongoing", created_at: "2026-01-01", updated_at: "2026-01-01",
    chapters: [{ count: 3 }], publication_type: "translation", publisher_id: "publisher",
  };
  const chapters = [
    { id: "c1", number: 1, is_free: true, content: "PUBLIC CHAPTER" },
    { id: "c2", number: 2, is_free: false, content: "PAID CHAPTER SECRET" },
    { id: "c3", number: 3, is_free: false, content: "TIMED CHAPTER SECRET", unlock_at: "2099-01-01" },
  ].map((chapter) => ({
    novel_id: novel.id, title: `Chapter ${chapter.number}`, is_published: true,
    coin_cost: 5, published_at: "2026-01-01", unlock_at: null, ...chapter,
  }));
  const state = { user: null, unlocked: [], otherUnlocks: [], unlockRequests: [], failUnlocks: false, sessionReads: 0, bodyReads: [], expired: [], connections: 0 };
  const entries = new Map();
  const expire = (tag) => {
    state.expired.push(tag);
    for (const [key, entry] of entries) if (entry.tags.includes(tag)) entries.delete(key);
  };
  const cache = {
    cacheLife() {}, cacheTag() {}, updateTag: expire, revalidatePath() {},
    revalidateTag: expire,
    unstable_cache(fn, keyParts, options) {
      return async (...args) => {
        const key = JSON.stringify([keyParts, args]);
        if (entries.has(key)) return entries.get(key).value;
        const value = await fn(...args);
        entries.set(key, { value, tags: options.tags });
        return value;
      };
    },
  };
  function from(table) {
    let columns = "";
    let mutation;
    let deleting = false;
    const filters = [];
    const filterValues = [];
    let limit;
    const query = {
      select(value) { columns = value; return query; },
      eq(key, value) { filterValues.push([key, value]); filters.push((row) => row[key] === value); return query; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
      order() { return query; },
      limit(value) { limit = value; return query; },
      update(value) { mutation = value; return query; },
      delete() { deleting = true; return query; },
      async maybeSingle() { return finish(true); },
      then(resolve, reject) { return Promise.resolve(finish(false)).then(resolve, reject); },
    };
    function finish(single) {
      if (table === "chapter_unlocks") {
        state.unlockRequests.push({ columns, filters: filterValues, limit });
        if (state.failUnlocks) return { data: null, error: new Error("Database unavailable") };
      }
      let rows = table === "novels" ? [novel]
        : table === "profiles" ? [{ id: "publisher", username: "Publisher" }]
        : table === "chapter_unlocks" ? [...state.unlocked.map((chapter_number) => ({ chapter_number, novel_slug: "story", user_id: state.user?.id })), ...state.otherUnlocks]
        : chapters;
      rows = rows.filter((row) => filters.every((filter) => filter(row)));
      if (limit) rows = rows.slice(0, limit);
      if (mutation) rows.forEach((row) => Object.assign(row, mutation));
      if (deleting && table === "chapters") {
        for (const row of rows) chapters.splice(chapters.indexOf(row), 1);
      }
      if (table === "chapters" && columns === "content") state.bodyReads.push(rows[0]?.number);
      const data = rows.map((row) => ({ ...row, novels: { publisher_id: novel.publisher_id } }));
      return { data: single ? data[0] ?? null : data, error: null };
    }
    return query;
  }
  const tags = loadTs("./chapter-cache-tags.ts", {});
  const mocks = {
    "@/lib/comment-pagination": loadTs("./comment-pagination.ts"),
    "@/lib/novel-title-search": loadTs("./novel-title-search.ts"),
    react: { cache: (fn) => fn },
    "next/cache": cache,
    "next/server": { connection: async () => { state.connections++; } },
    "next/navigation": { redirect: (url) => { throw new Error(`redirect:${url}`); } },
    "@/lib/chapter-cache-tags": tags,
    "@/utils/supabase/admin": { createAdminClient: () => ({ from }) },
    "@/utils/supabase/auth": {
      getAuthClaims: async () => state.user && { sub: state.user.id },
      getServerSupabase: async () => ({ from }),
    },
    "@/lib/session-profile": { getSessionProfile: async () => { state.sessionReads++; return state.user; } },
    "@/lib/roles": { parseProfileRoles: () => [], hasProfileRole: () => false },
    "@/lib/utils": { formatRelativeDate: () => "today" },
    "@/lib/access": { getAdminAccess: async () => ({ isMasterAdmin: true, userId: "publisher" }) },
    "@/lib/notifications/data": { notifyBookmarkersOfChapter: async () => {}, notifyBookmarkersOfChapters: async () => {} },
    "@/lib/cover-file": {}, "@/lib/chapter-import": {},
    "@/lib/workspace": { WORKSPACE_BASE: { translations: "/workspace" }, workspaceInternalPath: (path) => path },
    "@/lib/constants": {},
  };
  const data = loadTs("./data/index.ts", mocks);
  const actions = loadTs("../app/workspace/actions.ts", { ...mocks, "@/lib/data": data });
  const user = (id, isAdmin = false) => ({ id, isAdmin, roles: [], isTranslator: false });
  return { state, data, actions, chapters, user };
}

test("public prerenders never read paid or timed-release bodies", async () => {
  const { data, state } = fixture();
  assert.equal((await data.getPublicFreeChapter("story", 1)).content[0], "PUBLIC CHAPTER");
  assert.equal(await data.getPublicFreeChapter("story", 2), undefined);
  assert.equal(await data.getPublicFreeChapter("story", 3), undefined);
  assert.deepEqual(state.bodyReads, [1]);
});

test("free and due chapter checks need no session or entitlement lookup", async () => {
  const { data, state, user, chapters } = fixture();
  state.user = user("reader");
  chapters[2].unlock_at = "2020-01-01";
  assert.equal(await data.isChapterReadable("story", 1), true);
  assert.equal(await data.isChapterReadable("story", 3), true);
  assert.equal(await data.isChapterReadable("story", 999), false);
  assert.equal(await data.isChapterReadable("story", NaN), false);
  assert.equal(state.sessionReads, 0);
  assert.equal(state.unlockRequests.length, 0);
});

test("paid reads query only the requested chapter and explicitly scope the reader", async () => {
  const { data, state, user } = fixture();
  state.user = user("buyer");
  state.unlocked = [1, 2, 3];
  assert.equal((await data.getChapter("story", 2)).locked, false);
  assert.equal(await data.isChapterReadable("story", 2), true);
  assert.ok(state.unlockRequests.every((request) => request.columns === "chapter_number" && request.limit === 1));
  assert.ok(state.unlockRequests.every((request) => JSON.stringify(request.filters) === JSON.stringify([
    ["user_id", "buyer"], ["novel_slug", "story"], ["chapter_number", 2],
  ])));
  state.user = user("other-reader");
  state.unlocked = [];
  state.otherUnlocks = [{ user_id: "buyer", novel_slug: "story", chapter_number: 2 }];
  assert.equal((await data.getChapter("story", 2)).content, undefined);
  assert.equal(await data.isChapterReadable("story", 2), false);
});

test("access failures fail closed and publishers cannot read nonexistent chapters", async () => {
  const { data, state, user } = fixture();
  state.user = user("buyer");
  state.failUnlocks = true;
  await assert.rejects(data.getChapter("story", 2), /Could not check chapter access/);
  await assert.rejects(data.isChapterReadable("story", 2), /Could not check chapter access/);
  assert.deepEqual(state.bodyReads, []);
  state.user = user("publisher");
  assert.equal(await data.isChapterReadable("story", 999), false);
  assert.equal(await data.isChapterReadable("story", 2), true);
  assert.equal((await data.getChapter("story", 2)).adminAccess, true);
});

test("a buyer warming a shared body cache does not unlock it for other readers", async () => {
  const { data, state, user } = fixture();
  state.user = user("buyer");
  state.unlocked = [2];
  assert.equal((await data.getChapter("story", 2)).content[0], "PAID CHAPTER SECRET");
  assert.equal(await data.getPublicFreeChapter("story", 2), undefined);
  state.user = null;
  state.unlocked = [];
  assert.equal((await data.getChapter("story", 2)).locked, true);
  assert.equal((await data.getChapter("story", 2)).content, undefined);
  state.user = user("other-reader");
  assert.equal((await data.getChapter("story", 2)).content, undefined);
  assert.deepEqual(state.bodyReads, [2]);
  assert.equal(state.connections, 4);
});

test("publisher/admin access remains server checked; scheduled releases remain request-time", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-02T00:00:00Z") });
  const { data, state, user, chapters } = fixture();
  chapters[2].unlock_at = "2026-11-02T00:01:00Z";
  state.user = user("publisher");
  assert.equal((await data.getChapter("story", 2)).locked, false);
  state.user = user("admin", true);
  assert.equal((await data.getChapter("story", 2)).locked, false);
  state.user = null;
  assert.equal((await data.getChapter("story", 3)).locked, true);
  // Crossing the release time must work with the same cached metadata.
  t.mock.timers.tick(60001);
  assert.equal(await data.getPublicFreeChapter("story", 3), undefined);
  assert.equal((await data.getChapter("story", 3)).locked, false);
});

test("publishing one chapter leaves unrelated body caches warm", async () => {
  const { data, actions, state } = fixture();
  await data.getPublicFreeChapter("story", 1);
  assert.deepEqual(await actions.setChapterPublished("c2", true), {});
  await data.getPublicFreeChapter("story", 1);
  assert.deepEqual(state.bodyReads, [1]);
  assert.ok(state.expired.includes("novel-chapters:n1"));
  assert.ok(state.expired.includes("chapter-body:n1:2"));
  assert.ok(!state.expired.includes("novel-chapter-bodies:n1"));
  assert.ok(state.expired.includes("novel-detail:story"));
  assert.ok(!state.expired.includes("novel-details"));
});

test("editing a free chapter refreshes its body without flushing other chapters", async () => {
  const { data, actions, state } = fixture();
  await data.getPublicFreeChapter("story", 1);
  const form = new FormData();
  form.set("content", "CORRECTED PUBLIC CHAPTER");
  form.set("access", "free");
  await actions.updateChapter("c1", {}, form);
  assert.equal((await data.getPublicFreeChapter("story", 1)).content[0], "CORRECTED PUBLIC CHAPTER");
  assert.deepEqual(state.bodyReads, [1, 1]);
  assert.ok(!state.expired.includes("chapter-body:n1:2"));
});

for (const mutation of ["unpublish", "delete"]) {
  test(`${mutation} immediately removes a cached free chapter`, async () => {
    const { data, actions } = fixture();
    await data.getPublicFreeChapter("story", 1);
    if (mutation === "unpublish") await actions.setChapterPublished("c1", false);
    else await actions.deleteChapter("c1");
    assert.equal(await data.getPublicFreeChapter("story", 1), undefined);
    assert.equal(await data.getChapter("story", 1), undefined);
  });
}

test("free-to-paid changes immediately remove public access, including after renumbering", async () => {
  const { data, actions, state } = fixture();
  await data.getPublicFreeChapter("story", 1);
  const form = new FormData();
  for (const [key, value] of Object.entries({ content: "UPDATED SECRET", access: "paid", coinCost: "5", number: "4" })) form.set(key, value);
  assert.equal((await actions.updateChapter("c1", {}, form)).success, "Chapter saved.");
  assert.equal(await data.getPublicFreeChapter("story", 1), undefined);
  assert.equal(await data.getPublicFreeChapter("story", 4), undefined);
  assert.equal((await data.getChapter("story", 4)).locked, true);
  assert.ok(state.expired.includes("chapter-body:n1:1"));
  assert.ok(state.expired.includes("chapter-body:n1:4"));
});
