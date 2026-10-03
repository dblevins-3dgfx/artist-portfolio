import worksJson from "../../content/works.json";
import type { Work } from "@/lib/types";

export function getWorks(): Work[] {
  return worksJson as Work[];
}

export function getWork(slug: string) {
  return getWorks().find((work) => work.slug === slug);
}
