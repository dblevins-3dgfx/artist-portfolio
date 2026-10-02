import { z } from "zod";

export const requestItemSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  sizeId: z.string().trim().min(1).max(40),
  qty: z.number().int().min(1).max(10),
});

export const requestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "Enter a valid email address." })),
  phone: z.string().trim().max(40),
  street: z.string().trim().min(3, "Enter a street address.").max(160),
  city: z.string().trim().min(2, "Enter a city.").max(80),
  region: z.string().trim().min(2, "Enter a state or region.").max(80),
  postal: z.string().trim().min(2, "Enter a postal code.").max(20),
  country: z.string().trim().min(2, "Enter a country.").max(80),
  notes: z.string().trim().max(2000),
  company: z.string().optional(),
  items: z.array(requestItemSchema).min(1, "Add a print before sending.").max(30),
});

export type RequestInput = z.infer<typeof requestSchema>;

export function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
