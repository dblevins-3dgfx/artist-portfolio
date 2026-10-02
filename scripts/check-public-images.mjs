import { createHash } from "crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const studio = JSON.parse(readFileSync(path.join(root, "content", "studio.json"), "utf8"));
const works = JSON.parse(readFileSync(path.join(root, "content", "works.json"), "utf8"));
const manifest = JSON.parse(readFileSync(path.join(root, "content", "art-manifest.json"), "utf8"));
const maxEdge = Number(studio.maxPreviewEdge) || 1400;
const artDir = path.join(root, "public", "art");
const errors = [];

function listRasters(directory) {
  if (!existsSync(directory)) return [];
  const found = [];
  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      found.push(...listRasters(absolute));
      continue;
    }
    if (/\.(jpe?g|png|tif|tiff|webp)$/i.test(entry)) found.push(absolute);
  }
  return found;
}

const publicRasters = listRasters(path.join(root, "public"));
for (const file of publicRasters) {
  const relative = path.relative(root, file);
  const meta = await sharp(file).metadata();
  if ((meta.width ?? 0) > maxEdge || (meta.height ?? 0) > maxEdge) {
    errors.push(`${relative} is ${meta.width}×${meta.height}. Previews must be ${maxEdge}px or smaller. Run npm run process-images instead of copying an original into public/.`);
  }
  if (meta.exif || meta.xmp || meta.iptc) {
    errors.push(`${relative} still has camera metadata. Run npm run process-images so location and camera details are stripped.`);
  }
  const stat = statSync(file);
  if (stat.size > 2 * 1024 * 1024) {
    errors.push(`${relative} is ${(stat.size / 1024 / 1024).toFixed(1)}MB. A preview should be well under 2MB.`);
  }
}

const artFiles = existsSync(artDir)
  ? readdirSync(artDir).filter((name) => /\.jpe?g$/i.test(name))
  : [];

for (const name of artFiles) {
  const recorded = manifest.files?.[name];
  if (!recorded) {
    errors.push(`public/art/${name} is not in content/art-manifest.json. Only files written by npm run process-images may be published.`);
    continue;
  }
  const bytes = readFileSync(path.join(artDir, name));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== recorded.sha256) {
    errors.push(`public/art/${name} does not match the processed file on record. Run npm run process-images.`);
  }
  if (recorded.width > maxEdge || recorded.height > maxEdge) {
    errors.push(`content/art-manifest.json allows ${name} above ${maxEdge}px.`);
  }
}

for (const name of Object.keys(manifest.files ?? {})) {
  if (!artFiles.includes(name)) {
    errors.push(`content/art-manifest.json lists ${name}, but public/art/${name} is missing.`);
  }
}

for (const work of works) {
  const name = path.basename(work.image ?? "");
  if (!work.image?.startsWith("/art/") || !artFiles.includes(name)) {
    errors.push(`${work.slug ?? work.title} points at ${work.image}, which is not a published preview.`);
  }
}

if (errors.length > 0) {
  console.error("Public image check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Public image check passed (${artFiles.length} preview${artFiles.length === 1 ? "" : "s"}).`);
