import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./test-helpers.mjs";

function fixture() {
  const state = {
    access: { userId: "publisher", username: "Translator", isTranslator: true, isMasterAdmin: false },
    novel: { id: "n1", slug: "story", publisher_id: "publisher", cover_url: null, translator: "Translator" },
    writes: [], paths: [], tags: [],
  };
  const admin = { from(table) {
    const filters = {};
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      insert(row) { state.writes.push({ table, row }); return query; },
      update(row) { state.writes.push({ table, row }); return query; },
      async maybeSingle() { return { data: filters.id ? state.novel : null, error: null }; },
      then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); },
    };
    return query;
  } };
  const actions = loadTs("../app/workspace/actions.ts", {
    "next/cache": { revalidatePath: (path) => state.paths.push(path), updateTag: (tag) => state.tags.push(tag) },
    "next/navigation": { redirect(path) { throw Object.assign(new Error(`redirect:${path}`), { digest: "NEXT_REDIRECT" }); } },
    "@/utils/supabase/admin": { createAdminClient: () => admin },
    "@/lib/access": { getAdminAccess: async () => state.access },
    "@/lib/data": { revalidateNovelsDataCache() {} },
    "@/lib/chapter-cache-tags": loadTs("./chapter-cache-tags.ts"),
    "@/lib/notifications/data": {},
    "@/lib/cover-file": loadTs("./cover-file.ts"),
    "@/lib/utils": loadTs("./utils.ts"),
    "@/lib/chapter-import": {},
    "@/lib/workspace": loadTs("./workspace.ts"),
    "@/lib/constants": loadTs("./constants.ts"),
  });
  return { state, actions };
}

function form(values = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ title: "  Story  ", ...values })) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

test("novel creation and editing preserve normalized fields, defaults, attribution and redirects", async () => {
  for (const values of [{}, {
    description: "  Synopsis  ", status: "completed", language: "Japanese",
    genres: ["Fantasy", "invalid", "Action"], tags: " magic, , magic, adventure ",
    novelupdatesUrl: " https://www.novelupdates.com/series/story ",
  }, { status: "invalid", language: "English" }]) {
    for (const mode of ["create", "edit"]) {
      const { state, actions } = fixture();
      const submit = () => mode === "create"
        ? actions.createNovel({}, form(values))
        : actions.updateNovel("n1", {}, form(values));
      await assert.rejects(submit, /redirect:\/workspace$/);
      const row = state.writes[0].row;
      assert.deepEqual({
        title: row.title, description: row.description, status: row.status,
        language: row.language, genres: row.genres, tags: row.tags,
        novelupdates_url: row.novelupdates_url, cover_url: row.cover_url,
        translator: row.translator, publisher_id: row.publisher_id, original_author: row.original_author,
      }, {
        title: "Story", description: values.description ? "Synopsis" : null,
        status: values.status === "completed" ? "completed" : "ongoing",
        language: values.language === "Japanese" ? "Japanese" : "Chinese",
        genres: values.genres ? ["Fantasy", "Action"] : [],
        tags: values.tags ? ["magic", "adventure"] : [],
        novelupdates_url: values.novelupdatesUrl ? "https://www.novelupdates.com/series/story" : null,
        cover_url: null, translator: "Translator", publisher_id: "publisher", original_author: null,
      });
      assert.ok(state.paths.includes("/workspace"));
      if (mode === "edit") assert.ok(state.paths.includes("/novels/story"));
    }
  }
});

test("novel actions retain validation and ownership error priority without writing invalid data", async () => {
  const cases = [
    { access: null, values: { title: "" }, error: "You are not authorized to perform this action." },
    { values: { title: "", novelupdatesUrl: "invalid" }, error: "Title is required." },
    { values: { cover: new File(["text"], "cover.txt", { type: "text/plain" }), novelupdatesUrl: "invalid" }, error: "Cover must be an image file (JPEG, PNG, WebP, or GIF)." },
    { values: { novelupdatesUrl: "invalid" }, error: "Enter a valid NovelUpdates URL (including https://)." },
    { values: { novelupdatesUrl: "ftp://novelupdates.com/story" }, error: "Your NovelUpdates link must start with http:// or https://." },
    { values: { novelupdatesUrl: "https://novelupdates.com.evil.example/story" }, error: "Your NovelUpdates link must point to novelupdates.com." },
    { denied: true, values: { novelupdatesUrl: "invalid" }, createError: "You need translator access to publish translations.", error: "Enter a valid NovelUpdates URL (including https://)." },
    { denied: true, foreign: true, values: {}, createError: "You need translator access to publish translations.", error: "You can only manage your own novels." },
  ];
  for (const scenario of cases) {
    for (const mode of ["create", "edit"]) {
      const { state, actions } = fixture();
      if ("access" in scenario) state.access = scenario.access;
      if (scenario.denied) state.access.isTranslator = false;
      if (scenario.foreign) state.novel.publisher_id = "other-publisher";
      const result = mode === "create"
        ? await actions.createNovel({}, form(scenario.values))
        : await actions.updateNovel("n1", {}, form(scenario.values));
      assert.deepEqual(result, { error: mode === "create" ? scenario.createError ?? scenario.error : scenario.error });
      assert.deepEqual(state.writes, []);
    }
  }
});
