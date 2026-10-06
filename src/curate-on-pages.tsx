import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio desk",
  robots: { index: false, follow: false },
};

export default function CurateOnPages() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Private</p>
      <h1 className="mt-3 font-heading text-5xl italic">Studio desk</h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed">
        This copy of the site is the static catalog. The desk, where paintings are added and edited, runs on the Vercel address, which can check a password.
      </p>
    </div>
  );
}
