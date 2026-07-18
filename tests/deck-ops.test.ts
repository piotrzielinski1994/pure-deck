import { describe, expect, it } from "vitest";
import {
  withCardAdded,
  withCardEdited,
  withCardRemoved,
} from "@/lib/workspace/deck-ops";
import type { Deck } from "@/lib/workspace/model";

function makeDeck(): Deck {
  return {
    id: "es",
    name: "Spanish",
    cards: [
      { id: "c1", front: "hola", back: "hello" },
      { id: "c2", front: "gato", back: "cat" },
    ],
  };
}

describe("withCardEdited (TC-007 / AC-001)", () => {
  it("should return a deck whose target card carries the patched front", () => {
    const deck = makeDeck();

    const next = withCardEdited(deck, "c1", { front: "buenos" });

    expect(next.cards.find((card) => card.id === "c1")).toEqual({
      id: "c1",
      front: "buenos",
      back: "hello",
    });
  });

  it("should patch only the fields present in the patch, leaving others intact", () => {
    const deck = makeDeck();

    const next = withCardEdited(deck, "c2", { back: "feline" });

    expect(next.cards.find((card) => card.id === "c2")).toEqual({
      id: "c2",
      front: "gato",
      back: "feline",
    });
  });

  it("should leave non-target cards unchanged", () => {
    const deck = makeDeck();

    const next = withCardEdited(deck, "c1", { front: "buenos" });

    expect(next.cards.find((card) => card.id === "c2")).toEqual({
      id: "c2",
      front: "gato",
      back: "cat",
    });
  });

  it("should not mutate the input deck or its cards", () => {
    const deck = makeDeck();
    const pristine = makeDeck();

    withCardEdited(deck, "c1", { front: "buenos" });

    expect(deck).toEqual(pristine);
  });
});

describe("withCardAdded (TC-007 / AC-004)", () => {
  it("should append a new card carrying the given front and back", () => {
    const deck = makeDeck();

    const next = withCardAdded(deck, "perro", "dog");

    expect(next.cards).toHaveLength(deck.cards.length + 1);
    const added = next.cards[next.cards.length - 1];
    expect(added.front).toBe("perro");
    expect(added.back).toBe("dog");
  });

  it("should assign the new card a fresh non-empty id differing from existing ids", () => {
    const deck = makeDeck();

    const next = withCardAdded(deck, "perro", "dog");
    const added = next.cards[next.cards.length - 1];

    expect(typeof added.id).toBe("string");
    expect(added.id.length).toBeGreaterThan(0);
    expect(deck.cards.map((card) => card.id)).not.toContain(added.id);
  });

  it("should not mutate the input deck or its cards", () => {
    const deck = makeDeck();
    const pristine = makeDeck();

    withCardAdded(deck, "perro", "dog");

    expect(deck).toEqual(pristine);
  });
});

describe("withCardRemoved (TC-007 / AC-003)", () => {
  it("should return a deck without the removed card", () => {
    const deck = makeDeck();

    const next = withCardRemoved(deck, "c1");

    expect(next.cards.map((card) => card.id)).toEqual(["c2"]);
  });

  it("should not mutate the input deck or its cards", () => {
    const deck = makeDeck();
    const pristine = makeDeck();

    withCardRemoved(deck, "c1");

    expect(deck).toEqual(pristine);
  });
});
