import type { Deck } from "@/lib/workspace/model";
import {
  decksFromFileMap,
  parseDeck,
  serializeDeck,
  seedFileMap,
  type CollectionStore,
} from "@/lib/workspace/collection";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";
import { slugify, uniqueSlug } from "@/lib/workspace/slug";

export function createInMemoryCollectionStore(
  files: Record<string, string> = {},
): CollectionStore {
  const load = (): Promise<Deck[]> => {
    if (Object.keys(files).length === 0) {
      Object.assign(files, seedFileMap(DEMO_DECKS));
    }
    return Promise.resolve(decksFromFileMap(files));
  };

  const save = (deck: Deck): Promise<void> => {
    const existingSlug = Object.keys(files).find(
      (slug) => parseDeck(files[slug])?.id === deck.id,
    );
    const slug =
      existingSlug ?? uniqueSlug(slugify(deck.name), new Set(Object.keys(files)));
    files[slug] = serializeDeck(deck);
    return Promise.resolve();
  };

  return { load, save };
}
