import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { loadTs } from "./test-helpers.mjs";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server");
const { unstable_doesMiddlewareMatch: doesProxyMatch } = require("next/experimental/testing/server");
const pagination = loadTs("./comment-pagination.ts");

test("proxy excludes public assets while covering pages, APIs and dotted slugs", () => {
  const { config } = loadTs("../proxy.ts", {
    "next/server": { NextResponse },
    "@/lib/blocked-crawlers": loadTs("./blocked-crawlers.ts"),
    "@/utils/supabase/middleware": {},
  });
  const matches = (url) => doesProxyMatch({ config, nextConfig: {}, url });
  for (const path of ["/fonts/woff2/NationalPark-Regular.woff2", "/fonts/woff/NationalPark-Regular.woff", "/_next/static/app.js", "/_next/image?url=test", "/favicon.ico", "/cuttle.png", "/background1.jpg", "/robots.txt", "/sitemap.xml", "/ads.txt", "/api/stripe/webhook"]) {
    assert.equal(matches(path), false, path);
  }
  for (const path of ["/", "/login", "/account", "/workspace", "/novels/story/1", "/novels/v1.2", "/novels/story.woff2", "/api/novels/story/unlocks", "/api/search-index", "/api/stripe/webhook-extra", "/fonts-old/story"]) {
    assert.equal(matches(path), true, path);
  }
});

test("public data GETs skip session refresh; pages, actions and private APIs retain it", async () => {
  let refreshes = 0;
  const { proxy } = loadTs("../proxy.ts", {
    "next/server": { NextResponse },
    "@/lib/blocked-crawlers": loadTs("./blocked-crawlers.ts"),
    "@/utils/supabase/middleware": { updateSession: async () => { refreshes++; return NextResponse.next(); } },
  });
  for (const path of ["/api/search-index", "/api/search-suggestions?q=a", "/api/novels/story/chapters", "/feed.xml", "/novels/story/feed.xml"]) {
    await proxy(new NextRequest(`https://example.com${path}`));
  }
  assert.equal(refreshes, 0);
  await proxy(new NextRequest("https://example.com/novels/story/1", { method: "POST" }));
  await proxy(new NextRequest("https://example.com/api/novels/story/unlocks"));
  await proxy(new NextRequest("https://example.com/account"));
  assert.equal(refreshes, 3);
  const blocked = await proxy(new NextRequest("https://example.com/api/search-index", { headers: { "user-agent": "ia_archiver" } }));
  assert.equal(blocked.status, 403);
  assert.equal(refreshes, 3);
});

const uuid = (i) => `00000000-0000-0000-0000-${i.toString(16).padStart(12, "0")}`;
function row(i, parentId = null, chapter = 1) {
  return { id: uuid(i), novel_slug: "story", chapter_number: chapter, parent_id: parentId,
    body: `Comment ${i}`, user_id: "reader", rating: null,
    created_at: "2026-11-01T12:00:00.123456+00:00", updated_at: "2026-11-01T12:00:00.123456+00:00" };
}

function fixture(rows) {
  const state = { rows, user: null, unlocked: [], requests: [], failReplies: false };
  const likes = Array.from({ length: 1205 }, (_, i) => ({ comment_id: uuid(1), user_id: `u${i}` }));
  const cache = new Map();
  function from(table) {
    const request = { table, columns: "", filters: [], orders: [], limit: null, cursor: null };
    const query = {
      select(columns) { request.columns = columns; return query; },
      eq(key, value) { request.filters.push([key, value]); return query; },
      is(key, value) { request.filters.push([key, value]); return query; },
      in(key, values) { request.filters.push([key, values]); return query; },
      order(key, options) { request.orders.push([key, options.ascending]); return query; },
      limit(limit) { request.limit = limit; return query; },
      or(filter) { request.cursor = filter; return query; },
      maybeSingle() { return Promise.resolve(finish(true)); },
      then(resolve, reject) { return Promise.resolve(finish(false)).then(resolve, reject); },
    };
    function finish(single) {
      state.requests.push(request);
      if (state.failReplies && request.filters.some(([key, value]) => key === "parent_id" && value != null)) return { data: null, error: new Error("Temporary outage") };
      let data = table === "novel_comments" ? state.rows : table === "novel_comment_likes" ? likes
        : table === "profiles" ? [{ id: "publisher", username: "Publisher" }, { id: "reader", username: "Reader" }]
        : table === "novels" ? [{ id: "novel", slug: "story", title: "Story", publication_type: "translation", publisher_id: "publisher", genres: [], tags: [], chapters: [{ count: 2 }], created_at: "2026-01-01", updated_at: "2026-01-01" }]
        : table === "chapters" ? [1, 2].map((number) => ({ id: uuid(2000 + number), novel_id: "novel", number, is_published: true, is_free: number === 1, published_at: "2026-01-01", unlock_at: null }))
        : table === "chapter_unlocks" ? state.unlocked.map((chapter_number) => ({ novel_slug: "story", chapter_number, user_id: state.user })) : [];
      data = data.filter((r) => request.filters.every(([key, value]) => Array.isArray(value) ? value.includes(r[key]) : r[key] === value));
      if (request.cursor) {
        const match = request.cursor.match(/^created_at\.(lt|gt)\.(.+),and\(created_at\.eq\.(.+),id\.(?:lt|gt)\.(.+)\)$/);
        assert.ok(match, request.cursor);
        const [, op, timestamp, , id] = match;
        data = data.filter((r) => op === "lt" ? r.created_at < timestamp || (r.created_at === timestamp && r.id < id) : r.created_at > timestamp || (r.created_at === timestamp && r.id > id));
      }
      data = [...data].sort((a, b) => {
        for (const [key, ascending] of request.orders) {
          const compare = String(a[key]).localeCompare(String(b[key]));
          if (compare) return ascending ? compare : -compare;
        }
        return 0;
      });
      if (request.limit) data = data.slice(0, request.limit);
      if (table === "novel_comments" && request.columns.includes("comment_reply_count")) {
        data = data.map((r) => ({ ...r,
          likes: [{ count: likes.filter((like) => like.comment_id === r.id).length }],
          comment_reply_count: state.rows.filter((reply) => reply.parent_id === r.id).length,
        }));
      }
      return { data: single ? data[0] ?? null : data, error: null };
    }
    return query;
  }
  const mocks = {
    react: { cache: (fn) => fn }, "next/server": {},
    "next/cache": { cacheLife() {}, cacheTag() {}, revalidateTag() {}, unstable_cache(fn, keys) { return async () => {
      const key = JSON.stringify(keys);
      if (cache.has(key)) return cache.get(key);
      const value = await fn(); cache.set(key, value); return value;
    }; } },
    "@/lib/comment-pagination": pagination,
    "@/lib/chapter-cache-tags": loadTs("./chapter-cache-tags.ts"),
    "@/lib/novel-title-search": loadTs("./novel-title-search.ts"),
    "@/utils/supabase/admin": { createAdminClient: () => ({ from }) },
    "@/utils/supabase/auth": { getAuthClaims: async () => state.user && { sub: state.user }, getServerSupabase: async () => ({ from }) },
    "@/lib/session-profile": { getSessionProfile: async () => state.user && { id: state.user, isAdmin: false, roles: [], isTranslator: false } },
    "@/lib/roles": {}, "@/lib/utils": {},
  };
  return { state, data: loadTs("./data/index.ts", mocks) };
}

test("chapter comments page beyond 100 rows with tied timestamps and no eager replies", async () => {
  const { data, state } = fixture(Array.from({ length: 127 }, (_, i) => row(i + 1)));
  let cursor = null;
  const ids = [];
  do {
    const page = await data.getChapterComments("story", 1, { cursor });
    assert.ok(page.comments.length <= 20);
    assert.ok(page.comments.every((c) => c.replies.length === 0));
    ids.push(...page.comments.map((c) => c.id));
    cursor = page.nextCursor;
    assert.equal(page.hasMore, cursor != null);
  } while (cursor);
  assert.equal(ids.length, 127);
  assert.equal(new Set(ids).size, 127);
  assert.ok(!state.requests.some((r) => r.filters.some(([key, value]) => key === "parent_id" && value != null)));
  assert.ok(!state.requests.some((r) => r.table === "novel_comment_likes"));
});

test("new posts and deletions do not shift the cursor or skip older comments", async () => {
  const { data, state } = fixture(Array.from({ length: 45 }, (_, i) => row(i + 1)));
  const first = await data.getNovelComments("story");
  state.rows.push(row(999));
  state.rows = state.rows.filter((c) => c.id !== first.comments[0].id);
  const next = await data.getNovelComments("story", { cursor: first.nextCursor });
  assert.equal(next.comments[0].id, uuid(25));
  assert.ok(!next.comments.some((c) => first.comments.some((p) => p.id === c.id)));
});

test("reply pages are oldest-first, limited to one parent, and recover after a failed request", async () => {
  const { data, state } = fixture([row(1), row(2), ...Array.from({ length: 23 }, (_, i) => row(i + 100, uuid(1))), row(500, uuid(2))]);
  state.failReplies = true;
  await assert.rejects(data.getCommentReplies(uuid(1)), /Could not load comments/);
  state.failReplies = false;
  let cursor = null;
  const ids = [];
  do {
    const page = await data.getCommentReplies(uuid(1), { cursor });
    assert.ok(page.comments.length <= 10);
    ids.push(...page.comments.map((c) => c.id));
    cursor = page.nextCursor;
  } while (cursor);
  assert.deepEqual(ids, Array.from({ length: 23 }, (_, i) => uuid(i + 100)));
});

test("shared public counts cannot leak another reader's like or ownership flags", async () => {
  const { data, state } = fixture([row(1)]);
  state.user = "u0";
  const liked = (await data.getNovelComments("story")).comments[0];
  assert.equal(liked.likeCount, 1205);
  assert.equal(liked.likedByCurrentUser, true);
  state.user = "reader";
  const owner = (await data.getNovelComments("story")).comments[0];
  assert.equal(owner.isOwn, true);
  assert.equal(owner.likedByCurrentUser, false);
  state.user = null;
  const anonymous = (await data.getNovelComments("story")).comments[0];
  assert.equal(anonymous.isOwn, false);
  assert.equal(anonymous.likedByCurrentUser, false);
  assert.ok(state.requests.filter((r) => r.table === "novel_comment_likes").every((r) => r.filters.some(([key]) => key === "user_id")));
});

test("chapter comment and reply access is checked even after a buyer warms the cache", async () => {
  const { data, state } = fixture([row(1, null, 2), row(2, uuid(1), 2)]);
  state.user = "buyer"; state.unlocked = [2];
  assert.equal((await data.getChapterComments("story", 2)).comments.length, 1);
  assert.equal((await data.getCommentReplies(uuid(1))).comments.length, 1);
  state.user = null; state.unlocked = [];
  await assert.rejects(data.getChapterComments("story", 2), /Unlock this chapter/);
  await assert.rejects(data.getCommentReplies(uuid(1)), /Unlock this chapter/);
});

test("invalid cursors and reply parents fail before querying the database", async () => {
  const { data, state } = fixture([]);
  for (const cursor of [12, { createdAt: "now(),id.gt.0", id: uuid(1) }, { createdAt: "2026-11-01T12:00:00Z", id: "anything)" }]) {
    await assert.rejects(data.getNovelComments("story", { cursor }), /Invalid comment cursor/);
  }
  await assert.rejects(data.getCommentReplies("invalid"), /Invalid comment/);
  assert.equal(state.requests.length, 0);
  assert.deepEqual(pagination.mergeCommentPages([{ id: "a" }], [{ id: "a" }, { id: "b" }, { id: "b" }]), [{ id: "a" }, { id: "b" }]);
});

test("a linked reply resolves its parent without loading earlier pages", async () => {
  const { data } = fixture([...Array.from({ length: 100 }, (_, i) => row(i + 1)), row(500, uuid(1))]);
  const first = await data.getNovelComments("story");
  assert.ok(!first.comments.some((c) => c.id === uuid(1)));
  const target = await data.getCommentTarget("story", uuid(500));
  assert.equal(target.id, uuid(1));
  assert.equal(target.replyCount, 1);
  assert.deepEqual(target.replies.map((r) => r.id), [uuid(500)]);
  assert.equal(await data.getCommentTarget("different-story", uuid(500)), null);
  assert.equal(await data.getCommentTarget("story", uuid(500), 2), null);
});

test("linked paid comments retain the same access checks as chapter pages", async () => {
  const { data, state } = fixture([row(1, null, 2), row(2, uuid(1), 2)]);
  state.user = "buyer"; state.unlocked = [2];
  assert.equal((await data.getCommentTarget("story", uuid(2))).replies.length, 1);
  state.user = null; state.unlocked = [];
  await assert.rejects(data.getCommentTarget("story", uuid(2)), /Unlock this chapter/);
});
