import type { Card, Deck } from "@/lib/workspace/model";
import { slugify, uniqueSlug } from "@/lib/workspace/slug";

export type CollectionStore = {
  load: () => Promise<Deck[]>;
  save: (deck: Deck) => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCard(value: unknown): Card | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, front, back } = value;
  if (
    typeof id !== "string" ||
    typeof front !== "string" ||
    typeof back !== "string"
  ) {
    return null;
  }
  return { id, front, back };
}

export function parseDeck(raw: string): Deck | null {
  const parsed = ((): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  })();
  if (!isRecord(parsed)) {
    return null;
  }
  const { id, name, cards } = parsed;
  if (typeof id !== "string" || typeof name !== "string" || !Array.isArray(cards)) {
    return null;
  }
  return {
    id,
    name,
    cards: cards
      .map(parseCard)
      .filter((card): card is Card => card !== null),
  };
}

export function serializeDeck(deck: Deck): string {
  return JSON.stringify(deck, null, 2);
}

export function seedFileMap(decks: Deck[]): Record<string, string> {
  const used = new Set<string>();
  return decks.reduce<Record<string, string>>((acc, deck) => {
    const slug = uniqueSlug(slugify(deck.name), used);
    return { ...acc, [slug]: serializeDeck(deck) };
  }, {});
}

export function decksFromFileMap(files: Record<string, string>): Deck[] {
  return Object.values(files)
    .map(parseDeck)
    .filter((deck): deck is Deck => deck !== null);
}
