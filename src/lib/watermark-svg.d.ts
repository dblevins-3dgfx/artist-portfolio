/*
 * Type declaration for watermark-svg.mjs. The .mjs is plain JavaScript so
 * the batch script (scripts/process-images.mjs) can import it without the
 * TypeScript compiler. This .d.ts is the header the .ts files type-check against.
 * The function returns SVG bytes whose letters are outlines, not font references.
 */
export function watermarkSvg(label: string, credit: string): Buffer;
