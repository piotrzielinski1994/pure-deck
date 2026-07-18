import type { Card, Deck } from "@/lib/workspace/model";

export function withCardEdited(
  deck: Deck,
  cardId: string,
  patch: Partial<Pick<Card, "front" | "back">>,
): Deck {
  return {
    ...deck,
    cards: deck.cards.map((card) =>
      card.id === cardId ? { ...card, ...patch } : card,
    ),
  };
}

export function withCardAdded(deck: Deck, front: string, back: string): Deck {
  return {
    ...deck,
    cards: [...deck.cards, { id: crypto.randomUUID(), front, back }],
  };
}

export function withCardRemoved(deck: Deck, cardId: string): Deck {
  return {
    ...deck,
    cards: deck.cards.filter((card) => card.id !== cardId),
  };
}
