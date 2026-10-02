import type { Metadata } from "next";
import { emailIsPublic, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "About the studio, the previews, and how prints are ordered.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio</p>
      <h1 className="mt-3 font-heading text-5xl italic">About</h1>
      {site.biography ? (
        <p className="mt-6 max-w-prose text-lg leading-relaxed">{site.biography}</p>
      ) : (
        <p className="mt-6 max-w-prose leading-relaxed">
          {site.artistName} makes original work and offers it as prints. A short biography
          can be added here when you are ready to write it in the studio’s own voice.
        </p>
      )}

      <h2 className="mt-14 font-heading text-3xl italic">The files</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Photographs of the work are kept by the studio. What is published is a smaller
        copy with a watermark repeated across it, and the camera information is removed.
        That is deliberate. The preview is for choosing a print, not for reproducing one.
      </p>

      <h2 className="mt-14 font-heading text-3xl italic">Ordering</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Orders are few enough to handle by hand. You send a request, the studio confirms
        the total, and the print is made after payment. {site.turnaround}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{site.paymentNote}</p>

      <h2 className="mt-14 font-heading text-3xl italic">Where to write</h2>
      <p className="mt-4 text-sm leading-relaxed">
        {site.location}
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
            · The public email address has not been set yet.
          </span>
        )}
      </p>
    </div>
  );
}
