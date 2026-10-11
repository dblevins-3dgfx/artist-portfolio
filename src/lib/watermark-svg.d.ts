/*
 * Type declaration for watermark-svg.mjs. The .mjs is plain JavaScript so
 * the batch script (scripts/process-images.mjs) can import it without the
 * TypeScript compiler. This .d.ts is the header the .ts files type-check against.
 * watermarkSvg returns SVG bytes whose letters are outlines, not font references.
 * applyWatermark draws that mark over a JPEG and returns the marked JPEG.
 */
export function watermarkSvg(label: string, credit: string): Buffer;
export function applyWatermark(plain: Buffer, label: string, credit: string): Promise<Buffer>;
