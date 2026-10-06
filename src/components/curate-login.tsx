"use client";

/*
 * Password form. login() runs on the server (see curate/actions.ts).
 * Pending state has to be read in a child of the form; useFormStatus does
 * not see a form from the component that renders the <form> itself.
 */
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type DeskFormState } from "@/app/curate/actions";

function SubmitPassword() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Checking…" : "Open the desk"}
    </Button>
  );
}

export function CurateLogin() {
  const [state, action] = useActionState(login, null as DeskFormState);

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Private</p>
      <h1 className="mt-3 font-heading text-5xl italic">Studio desk</h1>
      <p className="mt-6 text-lg leading-relaxed">This desk is for Thomasene. Enter the studio password.</p>
      <form action={action} className="mt-8 grid gap-4">
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2"
            aria-invalid={state?.error ? true : undefined}
          />
        </div>
        {state?.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <SubmitPassword />
      </form>
    </div>
  );
}
