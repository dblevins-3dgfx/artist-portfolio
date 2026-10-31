"use client";

/*
 * The print price grid at /curate/prices: sizes down the side, materials
 * across the top, one whole-dollar price per cell. A blank cell means that
 * size is not offered in that material.
 *
 * Sizes and materials are named by the artist and can be renamed, so each
 * row and column has a client-only id; the cells are keyed by ids, not
 * names, and a rename keeps its prices. Names only become keys when the
 * grid is sent. The server checks everything again (checkPrintPrices).
 *
 * The form submits from onSubmit, like the painting forms (see
 * useDeskForm in curate-desk.tsx), so a refused save keeps the grid as typed.
 */
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { savePrintPriceList, type DeskFormState } from "@/app/curate/actions";
import { FormError, PublishingNote } from "@/components/curate-desk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Publishing } from "@/lib/desk";
import type { PrintPrices } from "@/lib/print-prices";
import { withStaleCheck } from "@/lib/stale-page";

const saveFromDesk = withStaleCheck(savePrintPriceList);

type Line = { id: string; name: string };

let nextId = 0;
const newId = () => `line-${(nextId += 1)}`;
const cellKey = (material: Line, size: Line) => `${material.id}|${size.id}`;

function startingGrid(list: PrintPrices) {
  const sizes = list.sizes.map((name) => ({ id: newId(), name }));
  const materials = list.materials.map((name) => ({ id: newId(), name }));
  const cells: Record<string, string> = {};
  for (const material of materials) {
    for (const size of sizes) {
      const price = list.prices[material.name]?.[size.name];
      if (price) cells[cellKey(material, size)] = String(price);
    }
  }
  return { sizes, materials, cells };
}

export function PrintPricesEditor({
  list,
  publishing,
  saved,
}: {
  list: PrintPrices;
  publishing: Publishing;
  saved: boolean;
}) {
  const [start] = useState(() => startingGrid(list));
  const [sizes, setSizes] = useState<Line[]>(start.sizes);
  const [materials, setMaterials] = useState<Line[]>(start.materials);
  const [cells, setCells] = useState<Record<string, string>>(start.cells);
  const [state, action, pending] = useActionState(saveFromDesk, null as DeskFormState);
  const canSave = publishing !== "missing";

  const rename = (setLines: typeof setSizes, id: string, name: string) =>
    setLines((lines) => lines.map((line) => (line.id === id ? { ...line, name } : line)));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prices: Record<string, Record<string, string>> = {};
    for (const material of materials) {
      const row: Record<string, string> = {};
      for (const size of sizes) row[size.name] = cells[cellKey(material, size)] ?? "";
      prices[material.name] = row;
    }
    const formData = new FormData();
    formData.set(
      "priceList",
      JSON.stringify({ sizes: sizes.map((size) => size.name), materials: materials.map((material) => material.name), prices }),
    );
    startTransition(() => action(formData));
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm">
        <Link href="/curate" className="underline underline-offset-4">
          All paintings
        </Link>
      </p>
      <p className="mt-6 text-xs tracking-[0.18em] text-muted-foreground uppercase">Studio desk</p>
      <h1 className="mt-3 font-heading text-5xl italic">Print prices</h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed">
        One price list for every painting that offers prints. Prices are whole US dollars. Leave a cell blank when that size is not offered in that material.
      </p>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
        The public site does not show these prices. They are saved in the catalog’s repository, which anyone can read on GitHub.
      </p>
      <PublishingNote publishing={publishing} />
      {saved ? <p className="mt-4 text-sm">Saved.</p> : null}

      <form onSubmit={onSubmit} className="mt-10 grid gap-6 border border-border bg-card p-4 sm:p-5">
        {sizes.length === 0 && materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prices yet. Add a size and a material to start.</p>
        ) : (
          // Wide grids scroll inside this box, not the whole page.
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-2 text-sm">
              <thead>
                <tr>
                  <th scope="col" className="text-left align-bottom font-medium">
                    Size
                  </th>
                  {materials.map((material, index) => (
                    <th key={material.id} scope="col" className="align-bottom font-normal">
                      <div className="flex items-center gap-1">
                        <Input
                          aria-label={`Material ${index + 1} name`}
                          value={material.name}
                          onChange={(event) => rename(setMaterials, material.id, event.target.value)}
                          maxLength={40}
                          placeholder="Material"
                          className="w-28 font-medium"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${material.name || `material ${index + 1}`}`}
                          onClick={() => setMaterials((lines) => lines.filter((line) => line.id !== material.id))}
                        >
                          ×
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((size, index) => (
                  <tr key={size.id}>
                    <th scope="row" className="font-normal">
                      <div className="flex items-center gap-1">
                        <Input
                          aria-label={`Size ${index + 1} name`}
                          value={size.name}
                          onChange={(event) => rename(setSizes, size.id, event.target.value)}
                          maxLength={40}
                          placeholder="8×10"
                          className="w-24 font-medium"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${size.name || `size ${index + 1}`}`}
                          onClick={() => setSizes((lines) => lines.filter((line) => line.id !== size.id))}
                        >
                          ×
                        </Button>
                      </div>
                    </th>
                    {materials.map((material) => (
                      <td key={material.id}>
                        <Input
                          aria-label={`${size.name || "Unnamed size"} ${material.name || "unnamed material"} price`}
                          inputMode="numeric"
                          value={cells[cellKey(material, size)] ?? ""}
                          onChange={(event) =>
                            setCells((current) => ({ ...current, [cellKey(material, size)]: event.target.value }))
                          }
                          maxLength={9}
                          placeholder="—"
                          className="w-28"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => setSizes((lines) => [...lines, { id: newId(), name: "" }])}>
            Add a size
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMaterials((lines) => [...lines, { id: newId(), name: "" }])}
          >
            Add a material
          </Button>
        </div>
        <FormError state={state} />
        <div>
          <Button type="submit" disabled={pending || !canSave}>
            {pending ? "Saving…" : "Save prices"}
          </Button>
        </div>
      </form>
    </div>
  );
}
