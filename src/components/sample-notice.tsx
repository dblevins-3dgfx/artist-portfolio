export function SampleNotice({ count, hasStudioWork }: { count: number; hasStudioWork: boolean }) {
  if (count === 0) return null;
  const pictures =
    count === 1 ? "One picture on this site is a stand-in" : `${count} pictures on this site are stand-ins`;
  const rest = hasStudioWork
    ? ". The others are paintings from the studio."
    : ", so the catalog can be looked through before the studio’s photographs are added.";
  return (
    <div className="border-b border-border bg-secondary/70">
      <p className="mx-auto max-w-6xl px-5 py-3 text-sm leading-relaxed text-secondary-foreground">
        {pictures}
        {rest}
      </p>
    </div>
  );
}
