"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-20">
      <h1 className="font-heading text-5xl italic">Something went wrong</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The page did not finish loading. Try it again. If it keeps failing, the studio
        desk is the place to check the server.
      </p>
      <Button type="button" className="mt-8 h-11" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
