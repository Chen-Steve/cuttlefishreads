import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./test-helpers.mjs";
import { protos } from "@google-analytics/data";

function fixture() {
  const state = { fail: null, missing: false, reads: 0 };
  const cacheEntries = new Map();
  const cache = {
    cacheLife() {}, cacheTag() {}, revalidateTag() {},
    unstable_cache(fn, keys) {
      return async (...args) => {
        const key = JSON.stringify([keys, args]);
        if (cacheEntries.has(key)) return cacheEntries.get(key);
        const value = await fn(...args);
        cacheEntries.set(key, value);
        return value;
      };
    },
  };
  const novel = {
    id: "n", slug: "story", title: "Story", publisher_id: "publisher",
    genres: [], tags: [], chapters: [{ count: 1 }], status: "ongoing",
    created_at: "2026-01-01", updated_at: "2026-01-01", content: "PRIVATE", coins: 100,
  };
  const comment = { id: "c", user_id: "reader", novel_slug: "story", chapter_number: 1,
    parent_id: null, rating: 5, body: "A real comment", created_at: "2026-01-01", updated_at: "2026-01-01" };
  function from(table) {
    const request = { table, columns: "", replies: false };
    const query = {
      select(columns) { request.columns = columns; return query; },
      in(key) { if (key === "parent_id") request.replies = true; return query; },
      eq() { return query; }, is() { return query; }, not() { return query; },
      range() { return query; }, order() { return query; }, limit() { return query; },
      maybeSingle() { return Promise.resolve(finish(true)); },
      then(resolve, reject) { return Promise.resolve(finish(false)).then(resolve, reject); },
    };
    function finish(single) {
      state.reads++;
      if (state.fail?.(request)) return { data: null, error: new Error("Temporary database outage") };
      let rows = table === "novels" ? [{ ...novel, description: "A real synopsis" }]
        : table === "profiles" ? [{ id: "publisher", username: "Publisher" }]
        : table === "bookmarks" ? [{ novel_slug: "story" }]
        : table === "novel_comments" && !request.replies ? [comment]
        : table === "chapters" ? [{ number: 1, title: "First", is_free: true, published_at: "2026-01-01", novels: { slug: "story", title: "Story" } }]
        : [];
      if (state.missing) rows = [];
      return { data: single ? rows[0] ?? null : rows, error: null };
    }
    return query;
  }
  const admin = { from, rpc: async (name) => {
    state.reads++;
    return { data: [], error: state.fail?.({ table: name }) ? new Error("RPC unavailable") : null };
  } };
  const mocks = {
    "@/lib/comment-pagination": loadTs("./comment-pagination.ts"),
    react: { cache: (fn) => fn }, "next/cache": cache, "next/server": {},
    "@/utils/supabase/admin": { createAdminClient: () => admin },
    "@/utils/supabase/auth": { getAuthClaims: async () => null },
    "@/lib/session-profile": { getSessionProfile: async () => null },
    "@/lib/roles": { parseProfileRoles: () => [], hasProfileRole: () => false },
    "@/lib/utils": { formatRelativeDate: () => "today" },
    "@/lib/chapter-cache-tags": loadTs("./chapter-cache-tags.ts"),
    "@/lib/novel-title-search": loadTs("./novel-title-search.ts"),
  };
  const data = loadTs("./data/index.ts", mocks);
  const rss = loadTs("./rss.ts", { ...mocks, "@/lib/data": data, "@/lib/constants": {}, "@/lib/seo": {} });
  return { state, data, rss };
}

const cases = [
  ["catalog", (q) => q.table === "novels", (d) => d.getNovels()],
  ["novel detail", (q) => q.table === "novels", (d) => d.getNovel("story")],
  ["publisher fields", (q) => q.table === "profiles", (d) => d.getNovel("story")],
  ["featured synopses", (q) => q.columns === "slug, description", (d) => d.getFeaturedNovels()],
  ["recent updates", (q) => q.table === "recently_updated_chapters", (d) => d.getRecentlyUpdatedNovels()],
  ["bookmarks", (q) => q.table === "bookmarks", (d) => d.getUserBookmarkedNovels("reader")],
  ["public profile", (q) => q.table === "profiles", (d) => d.getPublicProfile("Publisher")],
  ["ratings", (q) => q.columns === "novel_slug, rating", (d) => d.getNovelRatingSummary("story")],
  ["comments", (q) => q.table === "novel_comments" && !q.replies, (d) => d.getNovelComments("story")],
  ["comment authors", (q) => q.columns === "id, username", (d) => d.getNovelComments("story")],
];

for (const [name, fail, read] of cases) {
  test(`${name}: failed loads are rejected; recovery is retried and cached`, async () => {
    const { data, state } = fixture();
    state.fail = fail;
    await assert.rejects(read(data));
    state.fail = null;
    const recovered = await read(data);
    const reads = state.reads;
    assert.deepEqual(await read(data), recovered);
    assert.equal(state.reads, reads, "Recovered data should be cached");
  });
}

test("a genuinely empty catalog and a genuinely missing novel remain valid cache results", async () => {
  const { data, state } = fixture();
  state.missing = true;
  assert.deepEqual(await data.getNovels(), []);
  assert.equal(await data.getNovel("missing"), undefined);
  state.fail = () => true;
  assert.deepEqual(await data.getNovels(), []);
  assert.equal(await data.getNovel("missing"), undefined);
});

test("public search index includes only slug, title and cover URL", async () => {
  const { data } = fixture();
  const index = await data.getNovelSearchIndex();
  assert.deepEqual(index, [{ slug: "story", title: "Story", coverUrl: undefined }]);
});

test("feed failures do not become successful empty feeds", async () => {
  const { rss, state } = fixture();
  state.fail = () => true;
  await assert.rejects(rss.getFeedItems(), /Could not load feed/);
  state.fail = null;
  assert.equal((await rss.getFeedItems()).length, 1);
});

test("analytics error presentation stays outside the cache and recovers on the next request", async (t) => {
  t.mock.method(console, "error", () => {});
  const keys = ["GOOGLE_ANALYTICS_PROPERTY_ID", "GOOGLE_ANALYTICS_CLIENT_EMAIL", "GOOGLE_ANALYTICS_PRIVATE_KEY"];
  const original = keys.map((key) => process.env[key]);
  keys.forEach((key) => { process.env[key] = "test-only"; });
  t.after(() => keys.forEach((key, i) => {
    if (original[i] === undefined) delete process.env[key]; else process.env[key] = original[i];
  }));
  let calls = 0;
  const entries = new Map();
  const { getGoogleAnalyticsDashboard } = loadTs("./google-analytics.ts", {
    "server-only": {}, "@/utils/supabase/admin": {},
    "next/cache": { unstable_cache(fn, keys) { return async () => {
      const key = JSON.stringify(keys);
      if (entries.has(key)) return entries.get(key);
      const value = await fn();
      entries.set(key, value);
      return value;
    }; } },
    "@google-analytics/data": { protos, BetaAnalyticsDataClient: class {
      async runReport() { if (++calls === 1) throw new Error("Temporary analytics outage"); return [{ rows: [] }]; }
      async close() {}
    } },
  });
  assert.equal((await getGoogleAnalyticsDashboard(["story"])).error, true);
  assert.equal((await getGoogleAnalyticsDashboard(["story"])).error, false);
  assert.equal((await getGoogleAnalyticsDashboard(["story"])).error, false);
  assert.equal(calls, 2);
});
