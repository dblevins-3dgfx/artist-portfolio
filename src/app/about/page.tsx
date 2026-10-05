import type { Metadata } from "next";
import Image from "next/image";
import { emailIsPublic, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.artistName}. ${site.tagline}.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio</p>
          <h1 className="mt-3 font-heading text-5xl italic">About</h1>
          {site.biography ? (
            site.biography.split(/\n\n+/).map((paragraph) => (
              <p key={paragraph} className="mt-6 max-w-prose text-lg leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="mt-6 max-w-prose text-lg leading-relaxed">{site.tagline}.</p>
          )}
          {!site.biography ? (
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
              A longer account of the work can be added here when it is ready to be written
              in the artist’s own voice.
            </p>
          ) : null}

          <h2 className="mt-14 font-heading text-3xl italic">Drop us a line</h2>
          <p className="mt-4 text-sm leading-relaxed">
            {site.location ? `${site.location}` : null}
            {site.location ? " · " : null}
            {site.domain}
            {emailIsPublic() ? (
              <>
                {" "}
                ·{" "}
                <a className="underline underline-offset-4" href={`mailto:${site.email}`}>
                  {site.email}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <figure>
          <Image
            src="/studio/thomasene.jpg"
            alt="Thomasene, on a dock beside a lake."
            width={1400}
            height={1050}
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="h-auto w-full border border-border bg-card"
          />
          <figcaption className="mt-3 text-sm text-muted-foreground">Thomasene.</figcaption>
        </figure>
      </div>

      <section className="mt-16 border-t border-border pt-12">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <div>
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">At the easel</p>
            <h2 className="mt-3 font-heading text-3xl italic">A painting in progress</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A landscape painted outdoors. The photograph is published smaller than the
              original, and the camera information has been removed. The painting itself
              stays with the studio.
            </p>
          </div>
          <figure>
            <Image
              src="/studio/plein-air.jpg"
              alt="A landscape painting in progress on an easel outdoors, with a palette of oil paint."
              width={1050}
              height={1400}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="h-auto w-full border border-border bg-card"
            />
          </figure>
        </div>
      </section>
    </div>
  );
}
