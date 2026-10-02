import Link from "next/link";

export function SampleNotice({ count }: { count: number }) {
  if (count === 0) return null;
  const pictures = count === 1 ? "One picture on this site is a stand-in" : `${count} pictures on this site are stand-ins`;
  return (
    <div className="border-b border-border bg-secondary/70">
      <p className="mx-auto max-w-6xl px-5 py-3 text-sm leading-relaxed text-secondary-foreground">
        {pictures}, so the catalog can be clicked through before your photographs are
        added. The{" "}
        <Link href="/studio" className="underline underline-offset-4">
          studio desk
        </Link>{" "}
        lists what still needs the artist’s name, prices, and pictures.
      </p>
    </div>
  );
}
