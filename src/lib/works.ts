import worksJson from "../../content/works.json";
import { parseWorks } from "@/lib/catalog";
import type { Work } from "@/lib/types";

export function getWorks(): Work[] {
  return parseWorks(worksJson);
}

export function getWork(slug: string) {
  return getWorks().find((work) => work.slug === slug);
}
