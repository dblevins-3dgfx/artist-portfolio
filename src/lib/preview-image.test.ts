import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import sharp from "sharp";
import { POSSIBLE_DUPLICATE_DISTANCE } from "@/lib/duplicates";
import { fingerprintDistance } from "@/lib/image-hash.mjs";
import { looksLikeImage, renderPreview } from "@/lib/preview-image";

// Test photographs are made in memory, so no image files live in the repo.
// A solid color is enough for size and metadata checks; a gradient gives
// the fingerprint something to see.
function solid(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 140, b: 160 } } })
    .jpeg()
    .toBuffer();
}

// Dark on the left, light on the right (or the reverse): every pixel of the
// 9×8 fingerprint is darker (or lighter) than its right-hand neighbor.
function gradient(width: number, height: number, reverse = false) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const level = Math.round((255 * (reverse ? width - 1 - x : x)) / (width - 1));
      pixels.fill(level, (y * width + x) * 3, (y * width + x) * 3 + 3);
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg()
    .toBuffer();
}

async function size(bytes: Buffer) {
  const meta = await sharp(bytes).metadata();
  return [meta.width, meta.height];
}

test("a landscape photograph is reduced to 1400px on its long edge", async () => {
  const preview = await renderPreview(await solid(2000, 1500));
  assert.deepEqual([preview.width, preview.height], [1400, 1050]);
  assert.deepEqual(await size(preview.buffer), [1400, 1050], "the reported size is the file's size");
});

test("a portrait photograph is reduced on its height", async () => {
  const preview = await renderPreview(await solid(1200, 1800));
  assert.deepEqual([preview.width, preview.height], [933, 1400]);
});

test("a photograph already under 1400px is not enlarged", async () => {
  const preview = await renderPreview(await solid(800, 600));
  assert.deepEqual([preview.width, preview.height], [800, 600]);
});

test("the camera's rotation is applied before sizing", async () => {
  // Phones store a portrait photo sideways with an EXIF orientation tag
  // (6 = rotate 90°). The preview must come out portrait, 1400px tall (#94).
  const sideways = await sharp(await solid(1800, 1200))
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const preview = await renderPreview(sideways);
  assert.deepEqual([preview.width, preview.height], [933, 1400]);
});

test("a full-size phone portrait is accepted and comes out portrait", async () => {
  // 4032×3024 stored, orientation 6: what an iPhone portrait looks like.
  const phone = await sharp({
    create: { width: 4032, height: 3024, channels: 3, background: { r: 90, g: 120, b: 150 } },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const preview = await renderPreview(phone);
  assert.deepEqual([preview.width, preview.height], [1050, 1400]);
});

test("a photograph smaller than the watermark tile is still marked", async () => {
  // The mark is a 560×320 tile; sharp refuses a tile larger than the image,
  // so watermark-svg.mjs shrinks it first. Both a narrow and a short image.
  for (const [width, height] of [
    [300, 400],
    [600, 200],
  ]) {
    const preview = await renderPreview(await solid(width, height));
    assert.deepEqual([preview.width, preview.height], [width, height]);
  }
});

test("camera information is removed, even when the photograph carried it", async () => {
  const withExif = await sharp(await solid(2000, 1500))
    .withExif({ IFD0: { Make: "TestCam", Model: "Location Leaker" } })
    .jpeg()
    .toBuffer();
  assert.ok((await sharp(withExif).metadata()).exif, "the test photograph really has EXIF");
  const meta = await sharp((await renderPreview(withExif)).buffer).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(meta.xmp, undefined);
  assert.equal(meta.iptc, undefined);
});

test("the preview is a JPEG and its hash matches its bytes", async () => {
  const preview = await renderPreview(await solid(2000, 1500));
  assert.equal((await sharp(preview.buffer).metadata()).format, "jpeg");
  assert.equal(preview.buffer[0], 0xff);
  assert.equal(preview.buffer[1], 0xd8);
  assert.equal(preview.sha256, createHash("sha256").update(preview.buffer).digest("hex"));
});

test("the watermark changes the pixels: the preview is not the plain reduced photograph", async () => {
  const photo = await solid(2000, 1500);
  const preview = await renderPreview(photo);
  const plain = await sharp(photo)
    .resize({ width: 1400 })
    .flatten({ background: "#f4efe6" })
    .jpeg({ quality: 70 })
    .raw()
    .toBuffer();
  const marked = await sharp(preview.buffer).raw().toBuffer();
  assert.equal(marked.length, plain.length);
  let differing = 0;
  for (let index = 0; index < marked.length; index += 1)
    if (Math.abs(marked[index] - plain[index]) > 16) differing += 1;
  // On a flat color the repeating mark shows across a good share of the image.
  assert.ok(differing / marked.length > 0.02, `only ${(100 * differing) / marked.length}% of values changed`);
});

test("the fingerprint is 16 hex digits and the same photograph gives the same one", async () => {
  const photo = await gradient(2000, 1500);
  const first = await renderPreview(photo);
  const second = await renderPreview(photo);
  assert.match(first.fingerprint, /^[0-9a-f]{16}$/);
  assert.equal(first.fingerprint, second.fingerprint);
});

test("very different photographs get fingerprints well past the duplicate threshold", async () => {
  const left = await renderPreview(await gradient(2000, 1500));
  const right = await renderPreview(await gradient(2000, 1500, true));
  assert.ok(fingerprintDistance(left.fingerprint, right.fingerprint) > POSSIBLE_DUPLICATE_DISTANCE);
});

test("something that is not a photograph is refused before any work", async () => {
  await assert.rejects(
    renderPreview(Buffer.from("not an image at all, just text")),
    /Use a JPEG, PNG, WebP, or TIFF photograph/,
  );
});

test("a file that starts like a JPEG but is broken is refused with a plain message", async () => {
  const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
  await assert.rejects(renderPreview(broken), /could not be prepared/);
});

test("looksLikeImage knows the JPEG, PNG, WebP, and TIFF signatures", () => {
  const pad = (head: number[] | string) => Buffer.concat([Buffer.from(head as never), Buffer.alloc(16)]);
  assert.equal(looksLikeImage(pad([0xff, 0xd8, 0xff])), true, "JPEG");
  assert.equal(looksLikeImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true, "PNG");
  assert.equal(
    looksLikeImage(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)])),
    true,
    "WebP",
  );
  assert.equal(looksLikeImage(pad([0x49, 0x49, 0x2a, 0x00])), true, "TIFF, little-endian");
  assert.equal(looksLikeImage(pad([0x4d, 0x4d, 0x00, 0x2a])), true, "TIFF, big-endian");
});

test("looksLikeImage refuses short and unknown files", () => {
  assert.equal(looksLikeImage(Buffer.from([0xff, 0xd8])), false, "too short to tell");
  assert.equal(looksLikeImage(Buffer.from("GIF89a-------")), false, "GIF is not accepted");
  assert.equal(
    looksLikeImage(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE"), Buffer.alloc(8)])),
    false,
    "a RIFF that is not WebP",
  );
  assert.equal(looksLikeImage(Buffer.from("%PDF-1.7 not an image")), false, "PDF");
});
