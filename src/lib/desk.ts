/*
 * Values that cross into the browser for the studio desk.
 * DeskWork is one row on the form. WorkFields is the validated save payload.
 * Publishing is where a save will land: GitHub (live site), this computer
 * (local dev), or nowhere (Vercel with no token). The browser uses it only
 * to choose which sentence to show. duplicateOf is empty, or a sentence
 * naming the other paintings that look like this one.
 */
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
  duplicateOf: string;
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
