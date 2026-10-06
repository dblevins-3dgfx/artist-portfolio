/*
 * Turn an upload into the JPEG the site is allowed to publish.
 * Long edge is capped, camera metadata (EXIF, including GPS) is dropped,
 * and a repeating watermark is drawn from font outlines. Outlines, not a
 * live font: the host that rasterizes SVG does not apply an embedded face,
 * and the mark was coming out as empty boxes.
 *
 * sharp() is a native image library. The pipeline is lazy until toBuffer().
 */
import { createHash } from "crypto";
import sharp from "sharp";
import studio from "../../content/studio.json";
import { watermarkSvg } from "./watermark-svg.mjs";

const MAX_EDGE = Number(studio.maxPreviewEdge) || 1400;

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
