import studio from "../../content/studio.json";

export const site = studio;

export type PrintSize = (typeof studio.prints)[number];

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

export function originalStatusLabel(status: string) {
  switch (status) {
    case "in-studio":
      return "The painting is in the studio";
    case "sold":
      return "The painting has been sold";
    default:
      return "The painting is not offered for sale";
  }
}
