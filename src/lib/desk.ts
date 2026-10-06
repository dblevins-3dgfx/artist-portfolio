export type Publishing = "github" | "local" | "missing";

export type DeskWork = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  widthIn: number;
  heightIn: number;
  statement: string;
  subject: string;
  featured: boolean;
  previewUrl: string;
  imageWidth: number;
  imageHeight: number;
};

export type WorkFields = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  widthIn: number;
  heightIn: number;
  statement: string;
  subject: string;
  featured: boolean;
};
