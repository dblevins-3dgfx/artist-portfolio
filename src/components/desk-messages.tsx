/*
 * Whole-page messages shared by the desk list (/curate) and a painting's
 * edit page (/curate/<slug>). Plain markup, so the server renders them.
 */
export function DeskSwitchedOff() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Private</p>
      <h1 className="mt-3 font-heading text-5xl italic">Studio desk</h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed">
        The desk is not switched on yet. In the Vercel project, set a long{" "}
        <span className="font-medium">STUDIO_PASSWORD</span>, and set{" "}
        <span className="font-medium">STUDIO_GITHUB_TOKEN</span> to a token that can update this
        repository. Redeploy, then open this page again.
      </p>
    </div>
  );
}

export function DeskLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-heading text-5xl italic">Studio desk</h1>
      <p role="alert" className="mt-6 max-w-prose text-sm leading-relaxed">
        {message}
      </p>
    </div>
  );
}
