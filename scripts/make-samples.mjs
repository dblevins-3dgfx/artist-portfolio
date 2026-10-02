import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { samples } from "./sample-art.mjs";

const root = process.cwd();
const originals = path.join(root, "originals");

await mkdir(originals, { recursive: true });

for (const sample of samples) {
  const imagePath = path.join(originals, `${sample.slug}.png`);
  const sidecarPath = path.join(originals, `${sample.slug}.json`);
  await sharp(Buffer.from(sample.svg)).png().toFile(imagePath);
  const sidecar = { ...sample };
  delete sidecar.svg;
  await writeFile(sidecarPath, JSON.stringify(sidecar, null, 2));
  console.log(`sample ${sample.slug}`);
}

console.log(`Wrote ${samples.length} sample originals in originals/. They are gitignored.`);
