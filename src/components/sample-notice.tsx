export function SampleNotice({ count }: { count: number }) {
  if (count === 0) return null;
  const pictures = count === 1 ? "One picture on this site is a stand-in" : `${count} pictures on this site are stand-ins`;
  return (
    <div className="border-b border-border bg-secondary/70">
      <p className="mx-auto max-w-6xl px-5 py-3 text-sm leading-relaxed text-secondary-foreground">
        {pictures}, so the catalog can be looked through before the studio’s photographs
        are added.
      </p>
    </div>
  );
}
