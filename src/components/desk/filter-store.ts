import { useSyncExternalStore } from "react";
import { deskFilter, type DeskFilter } from "@/lib/desk";

// The list filter is kept for this browser tab, so it survives opening a
// painting, saving, and landing back on the list. useSyncExternalStore reads
// it during render; the server always renders "all". If the browser blocks
// storage, the choice still works but lives only until the page reloads.
const FILTER_KEY = "studio-desk-filter";
let chosenFilter: string | null = null;
const filterListeners = new Set<() => void>();

function readFilter() {
  if (chosenFilter === null) {
    try {
      chosenFilter = window.sessionStorage.getItem(FILTER_KEY) ?? "all";
    } catch {
      chosenFilter = "all";
    }
  }
  return chosenFilter;
}

export function chooseFilter(id: string) {
  chosenFilter = id;
  try {
    window.sessionStorage.setItem(FILTER_KEY, id);
  } catch {
    // Storage is blocked; the in-memory choice above still applies.
  }
  for (const listener of filterListeners) listener();
}

function subscribeFilter(listener: () => void) {
  filterListeners.add(listener);
  return () => {
    filterListeners.delete(listener);
  };
}

// True once the page is running in the browser, after hydration. The stored
// filter is applied in that same render, so the scroll to a just-saved row
// waits for it instead of landing where the unfiltered list put the row.
const subscribeNothing = () => () => {};

// The list's filter for this tab, as a DeskFilter. Both the list and a
// painting's edit page (Previous/Next) read it.
export function useDeskFilter(): DeskFilter {
  return deskFilter(useSyncExternalStore(subscribeFilter, readFilter, () => "all"));
}

export function useHydrated() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
