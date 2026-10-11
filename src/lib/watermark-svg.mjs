import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");

const here = path.dirname(fileURLToPath(import.meta.url));
const FONT_CANDIDATES = [
  path.join(here, "../../assets/fonts/LiberationSerif-Bold.ttf"),
  "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
];

let font = null;

function loadFont() {
  if (font) return font;
  const found = FONT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("The watermark font is missing from this copy of the site.");
  }
  font = opentype.parse(readFileSync(found));
  return font;
}

function glyphFor(mark, character) {
  const glyph = mark.charToGlyph(character);
  if (!glyph || glyph.name === ".notdef") {
    throw new Error(`The watermark font has no letter for “${character}”.`);
  }
  return glyph;
}

function linePath(mark, text, centerX, baseline, fontSize, tracking) {
  const glyphs = Array.from(text).map((character) =>
    character === " " ? mark.charToGlyph(" ") : glyphFor(mark, character),
  );
  const scale = fontSize / mark.unitsPerEm;
  const widths = glyphs.map((glyph, index) => {
    const advance = (glyph.advanceWidth || 0) * scale;
    return advance + (index < glyphs.length - 1 ? tracking : 0);
  });
  const total = widths.reduce((sum, width) => sum + width, 0);
  let x = centerX - total / 2;
  const data = [];
  glyphs.forEach((glyph, index) => {
    if (glyph.name !== "space") data.push(glyph.getPath(x, baseline, fontSize).toPathData(2));
    x += widths[index];
  });
  return data.join(" ");
}

export function watermarkSvg(label, credit) {
  const mark = loadFont();
  const creditSize = credit.length > 32 ? 13 : 16;
  const title = linePath(mark, label, 280, 156, 40, 6);
  const note = linePath(mark, credit, 280, 188, creditSize, 1.6);
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="560" height="320">
  <g transform="rotate(-28 280 160)" fill="rgba(255,252,247,0.7)" stroke="rgba(24,18,14,0.62)" stroke-width="1.5" stroke-linejoin="round" paint-order="stroke">
    <path d="${title}"/>
  </g>
  <g transform="rotate(-28 280 160)" fill="rgba(255,252,247,0.62)" stroke="rgba(24,18,14,0.45)" stroke-width="0.75" stroke-linejoin="round" paint-order="stroke">
    <path d="${note}"/>
  </g>
</svg>`);
}

/*
 * The mark is one 560×320 tile, repeated. Sharp rejects a tile that is
 * wider or taller than the photograph, even with tile:true. A wide crop,
 * a tall crop, or a file already under that size hits that check.
 * Rasterize once so the tile has a known pixel size, then shrink it to
 * fit. A photograph already large enough keeps the full tile.
 */
const preparedTiles = new Map();

async function preparedTile(label, credit) {
  const key = `${label}\0${credit}`;
  const cached = preparedTiles.get(key);
  if (cached) return cached;
  const pending = sharp(watermarkSvg(label, credit))
    .png()
    .toBuffer()
    .then(async (png) => {
      const meta = await sharp(png).metadata();
      return { png, width: meta.width, height: meta.height };
    });
  preparedTiles.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    preparedTiles.delete(key);
    throw error;
  }
}

export async function applyWatermark(plain, label, credit) {
  const tile = await preparedTile(label, credit);
  const photo = await sharp(plain).metadata();
  const photoWidth = photo.width ?? tile.width;
  const photoHeight = photo.height ?? tile.height;
  let input = tile.png;
  if (photoWidth < tile.width || photoHeight < tile.height) {
    input = await sharp(tile.png)
      .resize({
        width: photoWidth,
        height: photoHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  }
  return sharp(plain)
    .composite([{ input, tile: true, blend: "over" }])
    .jpeg({ quality: 70, progressive: true })
    .toBuffer();
}
