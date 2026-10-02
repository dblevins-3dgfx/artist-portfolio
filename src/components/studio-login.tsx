"use client";

import { useActionState } from "react";
import { login } from "@/app/studio/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StudioLogin() {
  const [state, action, pending] = useActionState(login, { error: "" });

  return (
    <form action={action} className="max-w-md border border-border bg-card p-6">
      <h2 className="font-heading text-2xl italic">Open the desk</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Print requests saved on this server are listed after you sign in. The password
        lives in the server environment, not in the catalog.
      </p>
      {state.error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="mt-5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 h-11 bg-background px-3"
        />
      </div>
      <Button type="submit" className="mt-5 h-11" disabled={pending}>
        {pending ? "Checking…" : "Open"}
      </Button>
    </form>
  );
}
