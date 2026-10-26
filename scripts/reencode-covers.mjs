// Re-encode novel covers to small WebP files and point novels.cover_url at them.
//
//   node --env-file=.env scripts/reencode-covers.mjs           # dry run
//   node --env-file=.env scripts/reencode-covers.mjs --apply   # upload + update rows
//
// Original files are left in the bucket so a run can be rolled back from the
// log it writes (cover-reencode-<timestamp>.json).

import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "covers";
const MAX_WIDTH = 480;
const MAX_HEIGHT = 720;
const WEBP_QUALITY = 80;
/** Skip covers where re-encoding would save less than this fraction. */
const MIN_SAVING = 0.2;

const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const publicPrefix = `/storage/v1/object/public/${BUCKET}/`;

const { data: novels, error } = await supabase
  .from("novels")
  .select("id, slug, cover_url")
  .not("cover_url", "is", null);
if (error) throw error;

const log = [];
let before = 0;
let after = 0;

for (const novel of novels) {
  const prefixAt = novel.cover_url.indexOf(publicPrefix);
  if (prefixAt === -1) {
    console.log(`skip ${novel.slug}: not in the ${BUCKET} bucket`);
    continue;
  }
  const oldPath = decodeURIComponent(
    novel.cover_url.slice(prefixAt + publicPrefix.length).split("?")[0],
  );

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(oldPath);
  if (downloadError) {
    console.log(`skip ${novel.slug}: download failed (${downloadError.message})`);
    continue;
  }

  const original = Buffer.from(await blob.arrayBuffer());
  const encoded = await sharp(original)
    .rotate()
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
  if (encoded.length > original.length * (1 - MIN_SAVING)) {
    console.log(`keep ${novel.slug}: ${kb(original.length)} (re-encode ${kb(encoded.length)})`);
    before += original.length;
    after += original.length;
    continue;
  }

  before += original.length;
  after += encoded.length;
  console.log(`${apply ? "write" : "would write"} ${novel.slug}: ${kb(original.length)} -> ${kb(encoded.length)}`);
  if (!apply) continue;

  const newPath = `${novel.slug}-${Date.now()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, encoded, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "31536000",
    });
  if (uploadError) {
    console.log(`  upload failed: ${uploadError.message}`);
    continue;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(newPath);

  const { data: updated, error: updateError } = await supabase
    .from("novels")
    .update({ cover_url: publicUrl })
    .eq("id", novel.id)
    .eq("cover_url", novel.cover_url)
    .select("id");
  if (updateError || updated.length === 0) {
    console.log(`  row not updated (${updateError?.message ?? "cover changed meanwhile"}); removing upload`);
    await supabase.storage.from(BUCKET).remove([newPath]);
    continue;
  }

  log.push({ id: novel.id, slug: novel.slug, old: novel.cover_url, new: publicUrl });
}

console.log(
  `\n${novels.length} covers: ${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024 / 1024).toFixed(1)} MB${apply ? "" : " (dry run)"}`,
);

if (apply && log.length > 0) {
  const file = `cover-reencode-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(file, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`Updated ${log.length} novels. Rollback log: ${file}`);
}
