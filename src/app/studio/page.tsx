import type { Metadata } from "next";
import { emailIsPublic, site } from "@/lib/site";
import { getWorks } from "@/lib/works";

export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  const issues = readiness();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">For the studio</p>
      <h1 className="mt-3 font-heading text-5xl italic">Studio desk</h1>
      <p className="mt-4 max-w-xl leading-relaxed">
        Print requests are emails. A visitor prepares the order on this site, then sends it
        from their own mail program to the studio address. Nothing is stored here, and
        nothing is charged.
      </p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        GitHub Pages can only publish the catalog. It cannot keep a private inbox or hide
        this page behind a password. When a request arrives, reply with a total and an
        invoice, print from the original file on your computer, and ship it.
      </p>
      {emailIsPublic() ? (
        <p className="mt-4 text-sm">
          Requests are addressed to{" "}
          <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          .
        </p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed">
          The studio email is still the placeholder in <code>content/studio.json</code>.
          Until that is a real address, prepared requests have nowhere useful to go.
        </p>
      )}
      <Checklist issues={issues} />
    </div>
  );
}

function readiness() {
  const issues: string[] = [];
  if (site.artistName === "Artist Name") {
    issues.push(
      "Set artistName in content/studio.json, then run npm run process-images so the watermark uses the real name.",
    );
  }
  if (!emailIsPublic()) {
    issues.push("Set email in content/studio.json to the address buyers should reach.");
  }
  if (!site.domain || site.domain === "yourdomain.com") {
    issues.push("Set domain in content/studio.json to the GoDaddy domain, then reprocess the pictures.");
  }
  if (site.location === "City, State") {
    issues.push("Set location in content/studio.json.");
  }
  if (!site.biography.trim()) {
    issues.push("Write biography in content/studio.json when you want an about paragraph in the artist’s voice.");
  }
  const samples = getWorks().filter((work) => work.sample).length;
  if (samples > 0) {
    issues.push(
      `${samples} sample picture${samples === 1 ? "" : "s"} still on the site. Delete them from content/works.json, content/art-manifest.json, and public/art when the real photographs are in.`,
    );
  }
  return issues;
}

function Checklist({ issues }: { issues: string[] }) {
  if (issues.length === 0) {
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        The public details are filled in. New photographs still go through the image script
        before they are published.
      </p>
    );
  }
  return (
    <div className="mt-8 border border-border bg-secondary/50 p-5">
      <h2 className="font-heading text-2xl italic">Before you share the site</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}
