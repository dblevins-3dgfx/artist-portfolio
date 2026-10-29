/*
 * next/image asks this function for a URL. We do not resize on the fly:
 * previews are already small JPEGs.
 */
export default function imageLoader({ src }: { src: string }) {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return src.startsWith("/") ? src : `/${src}`;
}
