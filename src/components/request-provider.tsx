"use client";

import { useMemo, useSyncExternalStore } from "react";

export type CartItem = {
  slug: string;
  sizeId: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  setQty: (slug: string, sizeId: string, qty: number) => void;
  remove: (slug: string, sizeId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "print-request-v1";
const EMPTY: CartItem[] = [];

let snapshot: CartItem[] = EMPTY;
let snapshotRaw = "[]";
const listeners = new Set<() => void>();

function parse(raw: string): CartItem[] {
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(
      (item) =>
        item &&
        typeof item.slug === "string" &&
        typeof item.sizeId === "string" &&
        Number.isInteger(item.qty) &&
        item.qty > 0 &&
        item.qty <= 10,
    );
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: CartItem[]) {
  snapshot = next;
  snapshotRaw = JSON.stringify(next);
  localStorage.setItem(STORAGE_KEY, snapshotRaw);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = parse(raw);
  }
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

function addItem(item: CartItem) {
  const current = getSnapshot();
  const index = current.findIndex(
    (entry) => entry.slug === item.slug && entry.sizeId === item.sizeId,
  );
  if (index === -1) {
    commit([...current, item]);
    return;
  }
  commit(
    current.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, qty: Math.min(10, entry.qty + item.qty) } : entry,
    ),
  );
}

function setItemQty(slug: string, sizeId: string, qty: number) {
  const current = getSnapshot();
  commit(
    current.flatMap((entry) => {
      if (entry.slug !== slug || entry.sizeId !== sizeId) return [entry];
      if (qty <= 0) return [];
      return [{ ...entry, qty: Math.min(10, qty) }];
    }),
  );
}

function removeItem(slug: string, sizeId: string) {
  commit(getSnapshot().filter((entry) => entry.slug !== slug || entry.sizeId !== sizeId));
}

function clearItems() {
  commit([]);
}

export function useRequestCart(): CartContextValue {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      add: addItem,
      setQty: setItemQty,
      remove: removeItem,
      clear: clearItems,
    }),
    [items],
  );
}
