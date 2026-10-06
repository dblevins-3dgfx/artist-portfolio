"use client";

/*
 * Rendered when a page throws while rendering. Must be a Client Component:
 * reset() asks Next to render that page again. The file name is the convention.
 */
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <h1 className="font-heading text-5xl italic">Something went wrong</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The page did not finish loading. Try it again.
      </p>
      <Button type="button" className="mt-8 h-11" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
