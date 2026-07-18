import { describe, expect, it } from "vitest";
import {
  parseDeck,
  serializeDeck,
  seedFileMap,
  type CollectionStore,
} from "@/lib/workspace/collection";
import { createInMemoryCollectionStore } from "@/lib/workspace/in-memory-collection";
import { createCollectionStore } from "@/lib/workspace/collection-store-factory";
import { slugify, uniqueSlug } from "@/lib/workspace/slug";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";
import type { Deck } from "@/lib/workspace/model";

const deckA: Deck = {
  id: "a",
  name: "Alpha",
  cards: [{ id: "a1", front: "uno", back: "one" }],
};

const deckB: Deck = {
  id: "b",
  name: "Beta",
  cards: [
    { id: "b1", front: "dos", back: "two" },
    { id: "b2", front: "tres", back: "three" },
  ],
};

function sortedNames(decks: Deck[]): string[] {
  return decks.map((deck) => deck.name).sort();
}

describe("slugify (AC-004 / TC-004 / E-5)", () => {
  it("should lowercase and hyphenate a multi-word name", () => {
    expect(slugify("Get Users")).toBe("get-users");
  });

  it("should collapse non-alphanumerics to a single hyphen and trim edges", () => {
    expect(slugify("Español!")).toBe("espa-ol");
    expect(slugify("  Hello_World!!  ")).toBe("hello-world");
  });

  it("should fall back to untitled if the name is empty or all symbols", () => {
    expect(slugify("")).toBe("untitled");
    expect(slugify("***")).toBe("untitled");
  });
});

describe("uniqueSlug (AC-004 / TC-004 / E-5)", () => {
  it("should return the base unchanged and record it if unused", () => {
    const used = new Set<string>();

    expect(uniqueSlug("spanish", used)).toBe("spanish");
    expect(used.has("spanish")).toBe(true);
  });

  it("should append an incrementing numeric suffix on collision", () => {
    const used = new Set<string>(["spanish"]);

    expect(uniqueSlug("spanish", used)).toBe("spanish-2");
    expect(uniqueSlug("spanish", used)).toBe("spanish-3");
  });
});

describe("parseDeck (AC-003 / TC-003 / E-3 / E-4)", () => {
  it("should return the deck if the raw JSON is a well-formed deck", () => {
    expect(parseDeck(serializeDeck(deckA))).toEqual(deckA);
  });

  it("should return null if the raw string is not valid JSON", () => {
    expect(parseDeck("{ not json")).toBeNull();
  });

  it("should return null if the name field is missing", () => {
    expect(
      parseDeck('{"id":"d","cards":[{"id":"c1","front":"a","back":"b"}]}'),
    ).toBeNull();
  });

  it("should return null if the cards field is missing", () => {
    expect(parseDeck('{"id":"d","name":"D"}')).toBeNull();
  });

  it("should return null if the cards field is not an array", () => {
    expect(parseDeck('{"id":"d","name":"D","cards":"nope"}')).toBeNull();
  });

  it("should drop card rows with non-string or missing front/back and keep the valid ones", () => {
    const raw =
      '{"id":"d","name":"D","cards":[' +
      '{"id":"c1","front":"a","back":"b"},' +
      '{"id":"c2","front":"only front"},' +
      '{"id":"c3","front":1,"back":"z"}]}';

    const deck = parseDeck(raw);

    expect(deck).not.toBeNull();
    expect(deck?.cards).toEqual([{ id: "c1", front: "a", back: "b" }]);
  });
});

describe("serializeDeck (AC-002)", () => {
  it("should round-trip a deck back to an equal deck via parseDeck", () => {
    expect(parseDeck(serializeDeck(deckB))).toEqual(deckB);
  });
});

describe("seedFileMap (AC-002 / AC-004 / TC-004 / E-5)", () => {
  it("should produce one entry per deck whose value parses back to that deck", () => {
    const map = seedFileMap([deckA, deckB]);

    expect(Object.keys(map)).toHaveLength(2);
    const parsed = Object.values(map).map((raw) => parseDeck(raw));
    expect(sortedNames(parsed.filter((d): d is Deck => d !== null))).toEqual([
      "Alpha",
      "Beta",
    ]);
  });

  it("should de-duplicate slugs if two decks share a name", () => {
    const map = seedFileMap([
      { id: "s1", name: "Spanish", cards: [] },
      { id: "s2", name: "Spanish", cards: [] },
    ]);
    const keys = Object.keys(map);

    expect(keys).toHaveLength(2);
    expect(keys.filter((key) => key.startsWith("spanish"))).toHaveLength(2);
    expect(keys.some((key) => key.startsWith("spanish-2"))).toBe(true);
  });
});

describe("createInMemoryCollectionStore (AC-001 / AC-005 / TC-001)", () => {
  it("should load every valid deck file if the map is non-empty", async () => {
    const store: CollectionStore = createInMemoryCollectionStore({
      alpha: serializeDeck(deckA),
      beta: serializeDeck(deckB),
    });

    const decks = await store.load();

    expect(decks.map((deck) => deck.id).sort()).toEqual(["a", "b"]);
    expect(decks.find((deck) => deck.id === "b")?.cards).toEqual(deckB.cards);
  });
});

describe("createInMemoryCollectionStore seed-once (AC-002 / TC-002 / E-1 / E-2)", () => {
  it("should seed and return the demo decks if the map is absent", async () => {
    const store = createInMemoryCollectionStore();

    const first = await store.load();
    const second = await store.load();

    expect(sortedNames(first)).toEqual(sortedNames(DEMO_DECKS));
    expect(sortedNames(second)).toEqual(sortedNames(DEMO_DECKS));
  });

  it("should write one file per demo deck into an empty map on first load and not re-seed on the second", async () => {
    const files: Record<string, string> = {};
    const store = createInMemoryCollectionStore(files);

    await store.load();
    const keysAfterFirst = Object.keys(files).length;
    await store.load();
    const keysAfterSecond = Object.keys(files).length;

    expect(keysAfterFirst).toBe(DEMO_DECKS.length);
    expect(keysAfterSecond).toBe(keysAfterFirst);
  });
});

describe("createInMemoryCollectionStore tolerance (AC-003 / TC-003 / E-3 / E-4 / E-10)", () => {
  it("should skip malformed and partial files while loading the valid ones without throwing", async () => {
    const store = createInMemoryCollectionStore({
      good: serializeDeck(deckA),
      broken: "{ not json",
      partial: '{"id":"p","name":"Partial"}',
    });

    const decks = await store.load();

    expect(decks.map((deck) => deck.id)).toEqual(["a"]);
  });

  it("should drop bad card rows from an otherwise valid deck on load", async () => {
    const store = createInMemoryCollectionStore({
      mixed:
        '{"id":"m","name":"Mixed","cards":[' +
        '{"id":"c1","front":"a","back":"b"},' +
        '{"id":"c2","front":"missing back"}]}',
    });

    const decks = await store.load();

    expect(decks).toHaveLength(1);
    expect(decks[0].cards).toEqual([{ id: "c1", front: "a", back: "b" }]);
  });

  it("should ignore a non-deck file entry and still load the valid decks", async () => {
    const store = createInMemoryCollectionStore({
      alpha: serializeDeck(deckA),
      readme: "# these are just notes, not a deck",
    });

    const decks = await store.load();

    expect(decks.map((deck) => deck.id)).toEqual(["a"]);
  });
});

describe("createCollectionStore factory (AC-006 / TC-005 / E-6)", () => {
  it("should return the demo decks if fs is unavailable in a non-Tauri env", async () => {
    const decks = await createCollectionStore().load();

    expect(sortedNames(decks)).toEqual(sortedNames(DEMO_DECKS));
  });
});

describe("createInMemoryCollectionStore save (AC-006 / TC-006)", () => {
  it("should overwrite the matching entry so a later load returns the edited deck", async () => {
    const store = createInMemoryCollectionStore({
      beta: serializeDeck(deckB),
    });

    const edited: Deck = {
      ...deckB,
      cards: [
        { id: "b1", front: "DOS", back: "two" },
        { id: "b2", front: "tres", back: "three" },
      ],
    };

    await store.save(edited);
    const decks = await store.load();

    const reloaded = decks.find((deck) => deck.id === "b");
    expect(reloaded).toEqual(edited);
  });
});
