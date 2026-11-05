import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./test-helpers.mjs";

const data = loadTs("./data/index.ts", {
  "@/lib/chapter-list-page": loadTs("./chapter-list-page.ts"),
  "@/lib/comment-pagination": loadTs("./comment-pagination.ts"),
  "@/lib/novel-title-search": loadTs("./novel-title-search.ts"),
  "@/lib/chapter-cache-tags": loadTs("./chapter-cache-tags.ts"),
  "@/lib/roles": { parseProfileRoles: () => [], hasProfileRole: () => false },
  "@/lib/utils": { formatRelativeDate: () => "today" },
  "@/lib/session-profile": { getSessionProfile: async () => null },
  "@/utils/supabase/admin": { createAdminClient: () => ({}) },
  "@/utils/supabase/auth": { getAuthClaims: async () => null },
  react: { cache: (fn) => fn },
  "next/cache": { cacheLife() {}, cacheTag() {}, revalidateTag() {}, unstable_cache: (fn) => fn },
  "next/server": {},
});

function novel(slug, chapterCount, viewCount, extra = {}) {
  return {
    slug,
    chapterCount,
    viewCount,
    libraryAddCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

test("underrated prefers substantial novels with fewer views per chapter", async () => {
  const picks = await data.getUnderratedNovels(
    ["featured"],
    3,
    [
      novel("featured", 100, 0),
      novel("empty", 0, 0),
      novel("long-quiet", 40, 40),
      novel("long-read", 40, 400),
      novel("short-quiet", 2, 0),
      novel("older-tie", 20, 20, { createdAt: "2024-01-01T00:00:00.000Z" }),
      novel("newer-tie", 20, 20, { createdAt: "2025-06-01T00:00:00.000Z" }),
    ],
  );

  assert.deepEqual(
    picks.map((item) => item.slug),
    ["long-quiet", "older-tie", "newer-tie"],
  );
});

test("short novels fill underrated only after longer works run out", async () => {
  const picks = await data.getUnderratedNovels(
    [],
    3,
    [novel("long", 8, 80), novel("stub", 2, 0), novel("empty", 0, 0)],
  );

  assert.deepEqual(
    picks.map((item) => item.slug),
    ["long", "stub"],
  );
});
