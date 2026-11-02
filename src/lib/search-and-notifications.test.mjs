import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./test-helpers.mjs";

const { findClosestNovelTitle } = loadTs("./novel-title-search.ts");
const titles = [
  { slug: "long", title: "Love in the Rain" },
  { slug: "short", title: "Love" },
  { slug: "word", title: "A Winter Love" },
  { slug: "substring", title: "Beloved" },
];

test("autocomplete preserves exact, prefix, word, substring and shortest-title ranking", () => {
  assert.equal(findClosestNovelTitle(titles, " LOVE ").slug, "short");
  assert.equal(findClosestNovelTitle(titles, "lo").slug, "short");
  assert.equal(findClosestNovelTitle(titles, "winter").slug, "word");
  assert.equal(findClosestNovelTitle(titles, "loved").slug, "substring");
  assert.equal(findClosestNovelTitle(titles, "missing"), null);
  assert.equal(findClosestNovelTitle(titles, ""), null);
  assert.equal(findClosestNovelTitle(titles, "x".repeat(101)), null);
  assert.equal(findClosestNovelTitle([{ slug: "cn", title: "长安故事" }], "故事").slug, "cn");
});

test("search boxes share one index request; typing is local; the index refreshes after its TTL", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1000000 });
  const requests = [];
  let resolveFetch;
  t.mock.method(globalThis, "fetch", (url) => {
    requests.push(url);
    return new Promise((resolve) => { resolveFetch = resolve; });
  });
  const { loadNovelSearchIndex } = loadTs("./search-index-client.ts");
  const desktop = loadNovelSearchIndex();
  const mobile = loadNovelSearchIndex();
  assert.equal(desktop, mobile);
  resolveFetch({ ok: true, json: async () => ({ novels: titles }) });
  const index = await desktop;
  for (const query of ["l", "lo", "lov", "love"]) findClosestNovelTitle(index, query);
  assert.equal(await loadNovelSearchIndex(), index);
  assert.deepEqual(requests, ["/api/search-index"]);
  t.mock.timers.tick(300001);
  const refreshed = loadNovelSearchIndex();
  resolveFetch({ ok: true, json: async () => ({ novels: titles.slice(1) }) });
  assert.equal((await refreshed).length, 3);
  assert.equal(requests.length, 2);
});

test("failed index downloads are not cached and can be retried", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return calls === 1 ? { ok: false } : { ok: true, json: async () => ({ novels: titles }) };
  });
  const { loadNovelSearchIndex } = loadTs("./search-index-client.ts");
  await assert.rejects(loadNovelSearchIndex(), /Could not load/);
  assert.equal((await loadNovelSearchIndex()).length, 4);
  assert.equal(calls, 2);
});

function notifications(rpc) {
  return loadTs("./notifications/data.ts", {
    "@/lib/notifications/types": {},
    "@/utils/supabase/admin": { createAdminClient: () => ({
      rpc,
      from: () => { throw new Error("Unexpected per-row request"); },
    }) },
    "@/utils/supabase/auth": {},
  });
}

test("notifications normalize optional fields and omit self-notifications", async () => {
  const requests = [];
  const { notifyUsers } = notifications(async (name, args) => { requests.push({ name, args }); return {}; });
  await notifyUsers([]);
  await notifyUsers([{ user_id: "u", actor_id: "u", type: "like" }]);
  assert.equal(requests.length, 0);
  await notifyUsers([{ user_id: "u", type: "chapter_released", novel_id: "n", chapter_number: 2 }]);
  assert.equal(requests[0].name, "batch_insert_notifications");
  assert.deepEqual(requests[0].args.p_rows, [{ user_id: "u", actor_id: null, type: "chapter_released", comment_id: null, reply_id: null, novel_id: "n", chapter_number: 2 }]);
});

test("large notification jobs use bounded sequential batches", async () => {
  const sizes = [];
  let active = 0;
  const { notifyUsers } = notifications(async (_name, { p_rows }) => {
    assert.equal(active++, 0);
    sizes.push(p_rows.length);
    await Promise.resolve();
    active--;
    return { error: null };
  });
  await notifyUsers(Array.from({ length: 1201 }, (_, i) => ({ user_id: `u${i}`, type: "chapter_published" })));
  assert.deepEqual(sizes, [500, 500, 201]);
});

test("a failed notification batch never fans out into per-recipient requests", async (t) => {
  t.mock.method(console, "error", () => {});
  let requests = 0;
  const { notifyUsers } = notifications(async () => { requests++; return { error: { code: "23503" } }; });
  await notifyUsers(Array.from({ length: 501 }, (_, i) => ({ user_id: `u${i}`, type: "like" })));
  assert.equal(requests, 2);
});
