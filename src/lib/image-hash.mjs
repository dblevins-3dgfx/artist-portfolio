/*
 * A small fingerprint of a preview, so the desk can compare photographs
 * without looking at every pixel again.
 *
 * The value is a difference hash: shrink to 9×8 gray pixels, then one bit
 * per pixel saying whether it is darker than the pixel to its right.
 * Sixty-four bits, written as 16 hex characters. Two hashes are close when
 * few bits differ. The watermark and a second JPEG save do not move those
 * bits on a photograph that is actually the same.
 */
import sharp from "sharp";

export async function previewFingerprint(bytes) {
  const pixels = await sharp(bytes).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let hex = "";
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 4) {
      let nibble = 0;
      for (let bit = 0; bit < 4; bit += 1) {
        const index = y * 9 + x + bit;
        if (pixels[index] < pixels[index + 1]) nibble |= 1 << (3 - bit);
      }
      hex += nibble.toString(16);
    }
  }
  return hex;
}

export function fingerprintDistance(left, right) {
  if (!/^[0-9a-f]{16}$/.test(left) || !/^[0-9a-f]{16}$/.test(right)) return 64;
  let bits = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (bits) {
    distance += Number(bits & 1n);
    bits >>= 1n;
  }
  return distance;
}
