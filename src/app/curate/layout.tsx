/*
 * Shared by every desk page. Its only job is the desk's own manifest (#131),
 * so a Home Screen icon added from the desk opens the desk, not the front
 * page. See curate/manifest.webmanifest/route.ts.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/curate/manifest.webmanifest",
};

export default function CurateLayout({ children }: LayoutProps<"/curate">) {
  return children;
}
