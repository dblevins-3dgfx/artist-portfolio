/*
 * next/image asks this function for a URL. We do not resize on the fly:
 * previews are already small JPEGs, and the static export has no image server.
 * BASE_PATH is set for a GitHub Pages project site (the repo name prefix).
 */
export default function imageLoader({ src }: { src: string }) {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${base}${path}`;
}
