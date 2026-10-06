export type OriginalStatus = "in-studio" | "sold" | "not-for-sale";

export type CatalogWork = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  statement: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
};

export type Work = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  widthIn: number;
  heightIn: number;
  statement: string;
  featured: boolean;
  originalStatus: OriginalStatus;
  printsAvailable: boolean;
  image: string;
  imageWidth: number;
  imageHeight: number;
};
