import studio from "../../content/studio.json";

export const site = studio;

export function emailIsPublic() {
  return site.email.includes("@") && !site.email.endsWith("@example.com");
}

export function formatInches(widthIn: number, heightIn: number) {
  if (!widthIn || !heightIn) return null;
  return `${widthIn} × ${heightIn} in`;
}

export function workAlt(work: {
  title: string;
  medium: string;
  surface: string;
  year: number;
}) {
  const surface = work.surface ? ` on ${work.surface}` : "";
  return `${work.title}, ${work.medium.toLowerCase()}${surface}, ${work.year}. Watermarked preview.`;
}
