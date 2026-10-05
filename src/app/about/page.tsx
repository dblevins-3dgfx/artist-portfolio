import type { Metadata } from "next";
import { emailIsPublic, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.artistName}. ${site.tagline}.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio</p>
      <h1 className="mt-3 font-heading text-5xl italic">About</h1>
      {site.biography ? (
        <p className="mt-6 max-w-prose text-lg leading-relaxed">{site.biography}</p>
      ) : (
        <p className="mt-6 max-w-prose text-lg leading-relaxed">{site.tagline}.</p>
      )}
      {!site.biography ? (
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
          A longer account of the work can be added here when it is ready to be written
          in the artist’s own voice.
        </p>
      ) : null}

      <h2 className="mt-14 font-heading text-3xl italic">The files</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Photographs of the work stay with the studio. What is published is a smaller copy
        with a watermark repeated across it, and the camera information is removed.
      </p>

      <h2 className="mt-14 font-heading text-3xl italic">Drop us a line</h2>
      <p className="mt-4 text-sm leading-relaxed">
        {site.domain}
        {site.location ? ` · ${site.location}` : ""}
        {emailIsPublic() ? (
          <>
            {" "}
            ·{" "}
            <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </>
        ) : (
          <span className="text-muted-foreground">
            {" "}
            · A public email address has not been added yet.
          </span>
        )}
      </p>
    </div>
  );
}
