import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">404</p>
      <h1 className="mt-3 font-heading text-5xl italic">That page is not here</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The picture or page may have been renamed. The catalog is the sure way back.
      </p>
      <Link href="/work" className={cn(buttonVariants(), "mt-8 inline-flex h-11 px-4")}>
        Browse the work
      </Link>
    </div>
  );
}
