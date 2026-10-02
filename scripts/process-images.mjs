import { createHash } from "crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const originalsDir = path.join(root, "originals");
const publicDir = path.join(root, "public", "art");
const worksPath = path.join(root, "content", "works.json");
const manifestPath = path.join(root, "content", "art-manifest.json");
const studio = JSON.parse(readFileSync(path.join(root, "content", "studio.json"), "utf8"));

const MAX_EDGE = Number(studio.maxPreviewEdge) || 1400;
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"]);
const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
  "/Library/Fonts/Georgia Bold.ttf",
  "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
  "C:\\Windows\\Fonts\\timesbd.ttf",
];

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

function loadFontFace() {
  const found = FONT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    console.error(
      "No serif font found for the watermark. Install Liberation Serif or DejaVu Serif, or add a .ttf path to FONT_CANDIDATES in scripts/process-images.mjs.",
    );
    process.exit(1);
  }
  const base64 = readFileSync(found).toString("base64");
  return `@font-face{font-family:"Mark";src:url("data:font/ttf;base64,${base64}") format("truetype");font-weight:700;}`;
}

const fontFace = loadFontFace();

function watermarkSvg(label, credit) {
  const creditSize = credit.length > 32 ? 13 : 16;
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="560" height="320">
  <style>${fontFace}</style>
  <g transform="rotate(-28 280 160)">
    <text x="280" y="156" text-anchor="middle" font-family="Mark, Liberation Serif, serif" font-size="40" letter-spacing="6" fill="rgba(255,252,247,0.7)" stroke="rgba(24,18,14,0.62)" stroke-width="1.5" paint-order="stroke">${escapeXml(label)}</text>
    <text x="280" y="188" text-anchor="middle" font-family="Mark, Liberation Serif, serif" font-size="${creditSize}" letter-spacing="1.6" fill="rgba(255,252,247,0.62)" stroke="rgba(24,18,14,0.45)" stroke-width="0.75" paint-order="stroke">${escapeXml(credit)}</text>
  </g>
</svg>`);
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function walk(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  const found = [];
  for (const entry of readdirSync(directory)) {
    if (entry.startsWith(".")) continue;
    const absolute = path.join(directory, entry);
    const relative = prefix ? path.join(prefix, entry) : entry;
    const info = statSync(absolute);
    if (info.isDirectory()) {
      found.push(...walk(absolute, relative));
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry).toLowerCase())) found.push({ absolute, relative });
  }
  return found;
}

async function meanDiff(left, right) {
  const a = await sharp(left).raw().toBuffer();
  const b = await sharp(right).raw().toBuffer();
  const length = Math.min(a.length, b.length);
  let total = 0;
  let count = 0;
  for (let index = 0; index < length; index += 47) {
    total += Math.abs(a[index] - b[index]);
    count += 1;
  }
  return count === 0 ? 0 : total / count;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

const files = walk(originalsDir);
if (files.length === 0) {
  console.log("No images in originals/. Drop print-ready files there, then run this again.");
  process.exit(0);
}

await mkdir(publicDir, { recursive: true });
const works = await readJson(worksPath, []);
const manifest = await readJson(manifestPath, { files: {} });
manifest.files ??= {};

const used = new Set();
const label = String(studio.watermark || "PREVIEW").slice(0, 24);
const showDomain = studio.domain && studio.domain !== "yourdomain.com";
const credit = (showDomain ? `${studio.artistName} · ${studio.domain}` : studio.artistName).slice(0, 48);
const tile = watermarkSvg(label, credit);

for (const file of files) {
  const base = path.basename(file.relative, path.extname(file.relative));
  let slug = slugify(base);
  if (!slug) slug = "picture";
  if (used.has(slug)) {
    const folder = slugify(path.dirname(file.relative));
    slug = slugify(`${folder}-${base}`) || `${slug}-${used.size}`;
  }
  used.add(slug);

  const pipeline = sharp(file.absolute, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const landscape = !meta.width || !meta.height || meta.width >= meta.height;
  const resized = pipeline.resize({
    width: landscape ? MAX_EDGE : undefined,
    height: landscape ? undefined : MAX_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  });
  const plain = await resized
    .clone()
    .flatten({ background: "#f4efe6" })
    .jpeg({ quality: 70, progressive: true })
    .toBuffer();

  const marked = await sharp(plain)
    .composite([{ input: tile, tile: true, blend: "over" }])
    .jpeg({ quality: 70, progressive: true })
    .toBuffer();

  const changed = await meanDiff(plain, marked);
  if (changed < 0.15) {
    throw new Error(`Watermark did not show on ${file.relative} (difference ${changed.toFixed(3)}).`);
  }

  const outputName = `${slug}.jpg`;
  const outputPath = path.join(publicDir, outputName);
  await writeFile(outputPath, marked);

  const published = await sharp(outputPath).metadata();
  if (published.exif || published.xmp || published.iptc) {
    throw new Error(`Metadata survived on ${outputName}.`);
  }
  if ((published.width ?? 0) > MAX_EDGE || (published.height ?? 0) > MAX_EDGE) {
    throw new Error(`${outputName} is larger than ${MAX_EDGE}px.`);
  }

  const sidecarPath = path.join(path.dirname(file.absolute), `${base}.json`);
  const sidecar = existsSync(sidecarPath) ? JSON.parse(readFileSync(sidecarPath, "utf8")) : {};
  const existing = works.find((work) => work.slug === slug);
  const created = {
    title: titleFrom(base),
    year: new Date().getFullYear(),
    medium: "Painting",
    surface: "",
    widthIn: 0,
    heightIn: 0,
    statement: "",
    featured: false,
    originalStatus: "not-for-sale",
    printsAvailable: true,
    sample: false,
    ...sidecar,
    slug,
    image: `/art/${outputName}`,
    imageWidth: published.width,
    imageHeight: published.height,
  };
  delete created.svg;

  if (existing) {
    existing.image = created.image;
    existing.imageWidth = created.imageWidth;
    existing.imageHeight = created.imageHeight;
  } else {
    works.push(created);
  }

  const hash = createHash("sha256").update(marked).digest("hex");
  manifest.files[outputName] = {
    width: published.width,
    height: published.height,
    sha256: hash,
  };
  console.log(`${file.relative} → public/art/${outputName} (${published.width}×${published.height}, mark ${changed.toFixed(2)})`);
}

await writeFile(worksPath, `${JSON.stringify(works, null, 2)}\n`);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Updated content/works.json and content/art-manifest.json.");
console.log("Originals were not copied into public/.");

function titleFrom(base) {
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
