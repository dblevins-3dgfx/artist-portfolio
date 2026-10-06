import studio from "../../content/studio.json";

export const site = studio;

export function emailIsPublic() {
  return site.email.includes("@") && !site.email.endsWith("@example.com");
}

export function formatInches(widthIn: number, heightIn: number) {
  if (!widthIn || !heightIn) return null;
  return `${widthIn} × ${heightIn} in`;
}

export function formatMaterials(work: { medium: string; surface: string }) {
  const medium = work.medium.trim();
  const surface = work.surface.trim();
  if (medium && surface) return `${medium} on ${surface}`;
  return medium || surface || null;
}

export function workAlt(work: {
  title: string;
  medium: string;
  surface: string;
  year: number;
}) {
  const materials = formatMaterials(work);
  const detail = materials ? `, ${materials.toLowerCase()}` : "";
  return `${work.title}${detail}, ${work.year}. Watermarked preview.`;
}
