/*
 * The one subject list. Each entry is an id stored on a painting and the
 * label the desk and the work page show. The JSDoc mark on the array tells
 * TypeScript that each id is that exact word, not a general string.
 * Adding an entry here is enough. The desk, the work page, and
 * scripts/process-images.mjs all read this array.
 */
export const SUBJECTS = /** @type {const} */ ([
  { id: "children", label: "Children" },
  { id: "animals", label: "Animals" },
  { id: "places", label: "Places" },
  { id: "birds-and-flowers", label: "Birds & Flowers" },
  { id: "still-life", label: "Still Life" },
  { id: "portraits", label: "Portraits" },
]);
