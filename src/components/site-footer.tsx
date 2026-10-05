import Link from "next/link";
import { emailIsPublic, site } from "@/lib/site";

const links = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-heading text-2xl italic">{site.artistName}</p>
          {site.location ? (
            <p className="mt-1 text-sm text-muted-foreground">{site.location}</p>
          ) : null}
          {site.domain ? (
            <p className="mt-1 text-sm text-muted-foreground">{site.domain}</p>
          ) : null}
          {emailIsPublic() ? (
            <a
              className="mt-2 inline-block text-sm underline-offset-4 hover:underline"
              href={`mailto:${site.email}`}
            >
              {site.email}
            </a>
          ) : null}
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-5 pb-10 text-xs leading-relaxed text-muted-foreground">
        © {site.artistName}. All rights reserved. Pictures on this site are reduced,
        watermarked previews. The full photographs are not published.
      </p>
    </footer>
  );
}
