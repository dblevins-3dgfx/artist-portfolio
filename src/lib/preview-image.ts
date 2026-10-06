import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";
import sharp from "sharp";
import studio from "../../content/studio.json";

const MAX_EDGE = Number(studio.maxPreviewEdge) || 1400;

const FONT_CANDIDATES = [
  path.join(process.cwd(), "assets/fonts/LiberationSerif-Bold.ttf"),
  "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
];

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
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

let fontFace: string | null = null;

function loadFontFace() {
  if (fontFace) return fontFace;
  const found = FONT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("The watermark font is missing from this copy of the site.");
  }
  const base64 = readFileSync(found).toString("base64");
  fontFace = `@font-face{font-family:"Mark";src:url("data:font/ttf;base64,${base64}") format("truetype");font-weight:700;}`;
  return fontFace;
}

function watermarkSvg(label: string, credit: string) {
  const creditSize = credit.length > 32 ? 13 : 16;
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="560" height="320">
  <style>${loadFontFace()}</style>
  <g transform="rotate(-28 280 160)">
    <text x="280" y="156" text-anchor="middle" font-family="Mark, Liberation Serif, serif" font-size="40" letter-spacing="6" fill="rgba(255,252,247,0.7)" stroke="rgba(24,18,14,0.62)" stroke-width="1.5" paint-order="stroke">${escapeXml(label)}</text>
    <text x="280" y="188" text-anchor="middle" font-family="Mark, Liberation Serif, serif" font-size="${creditSize}" letter-spacing="1.6" fill="rgba(255,252,247,0.62)" stroke="rgba(24,18,14,0.45)" stroke-width="0.75" paint-order="stroke">${escapeXml(credit)}</text>
  </g>
</svg>`);
}

async function meanDiff(left: Buffer, right: Buffer) {
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

export function looksLikeImage(bytes: Buffer) {
  if (bytes.length < 12) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
  if (
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return true;
  }
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return true;
  }
  const tiffLittle = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00;
  const tiffBig = bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a;
  return tiffLittle || tiffBig;
}

export type PreviewImage = {
  buffer: Buffer;
  width: number;
  height: number;
  sha256: string;
};

export async function renderPreview(input: Buffer): Promise<PreviewImage> {
  if (!looksLikeImage(input)) {
    throw new Error("Use a JPEG, PNG, WebP, or TIFF photograph.");
  }

  const label = String(studio.watermark || "PREVIEW").slice(0, 24);
  const showDomain = studio.domain && studio.domain !== "yourdomain.com";
  const credit = (showDomain ? `${studio.artistName} · ${studio.domain}` : studio.artistName).slice(0, 48);
  const tile = watermarkSvg(label, credit);

  let plain: Buffer;
  try {
    const pipeline = sharp(input, { failOn: "none", limitInputPixels: 48_000_000 }).rotate();
    const meta = await pipeline.metadata();
    const landscape = !meta.width || !meta.height || meta.width >= meta.height;
    plain = await pipeline
      .resize({
        width: landscape ? MAX_EDGE : undefined,
        height: landscape ? undefined : MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#f4efe6" })
      .jpeg({ quality: 70, progressive: true })
      .toBuffer();
  } catch {
    throw new Error(
      "That photograph could not be prepared. Export a smaller JPEG, PNG, WebP, or TIFF and try again.",
    );
  }

  const marked = await sharp(plain)
    .composite([{ input: tile, tile: true, blend: "over" }])
    .jpeg({ quality: 70, progressive: true })
    .toBuffer();

  const changed = await meanDiff(plain, marked);
  if (changed < 0.15) {
    throw new Error("The watermark did not show on that photograph. Try a different file.");
  }

  const published = await sharp(marked).metadata();
  if (published.exif || published.xmp || published.iptc) {
    throw new Error("Camera information was still attached to that preview, so it was not saved.");
  }
  if ((published.width ?? 0) > MAX_EDGE || (published.height ?? 0) > MAX_EDGE || !published.width || !published.height) {
    throw new Error("The preview came out the wrong size, so it was not saved.");
  }

  return {
    buffer: marked,
    width: published.width,
    height: published.height,
    sha256: createHash("sha256").update(marked).digest("hex"),
  };
}
