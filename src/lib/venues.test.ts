import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_VENUES, checkVenues, cleanShowings, isVenueId, parseVenues, serializeVenues } from "@/lib/venues";

const blueDoor = {
  id: "blue-door",
  name: "Blue Door Gallery",
  city: "Mendocino",
  contact: "Ann, 555-0100",
  notes: "Takes 40%.",
};

test("a stored venue list reads back as saved", () => {
  const venues = [blueDoor, { id: "corner-shop", name: "Corner Shop", city: "", contact: "", notes: "" }];
  assert.deepEqual(parseVenues(JSON.parse(serializeVenues(venues))), venues);
});

test("a stored list drops entries it cannot use", () => {
  const venues = parseVenues({
    venues: [
      blueDoor,
      { id: "blue-door", name: "Same id again" },
      { id: "Bad Id", name: "Bad id" },
      { id: "no-name", name: "   " },
      "junk",
      { id: "corner-shop", name: "  Corner   Shop ", city: 7, notes: "Line one\r\nLine two" },
    ],
  });
  assert.deepEqual(venues, [
    blueDoor,
    { id: "corner-shop", name: "Corner Shop", city: "", contact: "", notes: "Line one\nLine two" },
  ]);
  assert.deepEqual(parseVenues(null), []);
  assert.deepEqual(parseVenues({ venues: "nope" }), []);
});

test("venue ids look like web names", () => {
  for (const id of ["blue-door", "a", "shop-2"]) assert.equal(isVenueId(id), true, id);
  for (const id of ["", "Blue-Door", "blue door", "../x", "x".repeat(61), 7])
    assert.equal(isVenueId(id), false, String(id));
});

test("a save keeps existing ids and gives new venues an id from the name", () => {
  const checked = checkVenues({
    venues: [
      { id: "blue-door", name: "Blue Door Gallery (renamed)" },
      { id: "", name: "Café Été" },
      { name: "Blue Door" },
      { id: "", name: "!!!" },
    ],
  });
  assert.ok(!("error" in checked));
  assert.deepEqual(
    checked.map((venue) => venue.id),
    ["blue-door", "cafe-ete", "blue-door-2", "venue"],
  );
  assert.equal(checked[0].name, "Blue Door Gallery (renamed)");
});

test("a save refuses a missing name, a repeated name, a bad id, and too many venues", () => {
  assert.match(
    (checkVenues({ venues: [{ id: "", name: " " }] }) as { error: string }).error,
    /Give every venue a name/,
  );
  assert.match(
    (checkVenues({ venues: [{ name: "Corner Shop" }, { name: "corner shop" }] }) as { error: string }).error,
    /both called “Corner Shop”/,
  );
  assert.match((checkVenues({ venues: [{ id: "Bad Id", name: "X" }] }) as { error: string }).error, /did not arrive/);
  assert.match(
    (
      checkVenues({
        venues: [
          { id: "a", name: "X" },
          { id: "a", name: "Y" },
        ],
      }) as { error: string }
    ).error,
    /did not arrive/,
  );
  assert.match((checkVenues({ venues: [{ name: "x".repeat(81) }] }) as { error: string }).error, /80 characters/);
  const many = Array.from({ length: MAX_VENUES + 1 }, (_, index) => ({ name: `Venue ${index}` }));
  assert.match((checkVenues({ venues: many }) as { error: string }).error, /100 venues or fewer/);
  assert.match((checkVenues(null) as { error: string }).error, /did not arrive/);
  assert.deepEqual(checkVenues({ venues: [] }), []);
});

const known = new Set(["blue-door", "corner-shop"]);

const offered = (originalStatus: "in-studio" | "sold" | "not-for-sale") => ({ originalStatus, printsAvailable: true });

test("an Available original keeps its venue; any other original is not shown anywhere", () => {
  const showings = { originalShownAt: "blue-door", printsShownAt: [] };
  assert.equal(cleanShowings(showings, offered("in-studio"), known).originalShownAt, "blue-door");
  assert.equal(cleanShowings(showings, offered("sold"), known).originalShownAt, "");
  assert.equal(cleanShowings(showings, offered("not-for-sale"), known).originalShownAt, "");
});

test("prints are shown nowhere when prints are not offered", () => {
  const cleaned = cleanShowings(
    { originalShownAt: "blue-door", printsShownAt: ["corner-shop"] },
    { originalStatus: "in-studio", printsAvailable: false },
    known,
  );
  assert.deepEqual(cleaned, { originalShownAt: "blue-door", printsShownAt: [] });
});

test("prints can be at several venues, each once, but only venues still on the list", () => {
  const cleaned = cleanShowings(
    { originalShownAt: "gone", printsShownAt: ["corner-shop", "gone", "blue-door", "corner-shop"] },
    offered("in-studio"),
    known,
  );
  assert.deepEqual(cleaned, { originalShownAt: "", printsShownAt: ["corner-shop", "blue-door"] });
});
