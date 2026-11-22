/*
 * Structured data for search engines, as a <script> tag the visitor never
 * sees (#45). Renders nothing when there is no data, for example before the
 * site has a siteUrl. See lib/structured-data.ts.
 */
import { jsonLdText } from "@/lib/structured-data";

export function JsonLd({ data }: { data: object | null }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
