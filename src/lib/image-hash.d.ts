/*
 * Header for image-hash.mjs. The batch script imports the .mjs directly.
 * TypeScript files import this declaration.
 */
export function previewFingerprint(bytes: Buffer): Promise<string>;
export function fingerprintDistance(left: string, right: string): number;
