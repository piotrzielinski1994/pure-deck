# F1 - In-app card editing (add / edit / delete cards)

Backlog: [.pzielinski/todos.md](../../../.pzielinski/todos.md) F1

## Overview

The card grid already renders inputs per card, but they are inert (`defaultValue` only,
no `onChange`/save), and `CollectionStore` is `load`-only. Make cards editable in-app:
edit a card's front/back, delete a card, and add a card - each change persisted to the
deck's store. This reverses the deliberate read-only-store deferral (ADR 2026-07-17) and
retires the README "no in-app deck editing yet" caveat.

Scope is **card CRUD within an existing deck only**. Creating / renaming / deleting whole
decks is F3 and explicitly out of scope here.

## Acceptance Criteria

- AC-001: Editing a card's front or back and committing (input blur) persists the new
  value to the deck's store and updates the on-screen grid.
- AC-002: Committing an edit whose value is unchanged from the card's current value
  performs no store write (no-op).
- AC-003: Clicking a row's trash icon removes that card immediately (no confirm dialog)
  and persists the deck without it.
- AC-004: Committing the trailing add-row with BOTH front and back non-empty (after trim)
  creates a new card with a fresh unique id, appends it to the deck, persists the deck,
  and clears the add-row inputs.
- AC-005: Committing the add-row with either field empty or whitespace-only creates no
  card and leaves the typed text in place.
- AC-006: `CollectionStore` gains `save(deck)`; the tauri adapter writes to the same file
  (slug) the deck was loaded from, and the in-memory adapter overwrites the matching
  entry (matched by deck id).

## Test Cases

- TC-001 (happy, edit): deck with a card -> change front input value -> blur -> store
  save called with a deck whose card has the new front; grid shows new value. Maps: AC-001.
- TC-002 (no-op edit): blur an edit input without changing the value -> store save NOT
  called. Maps: AC-002.
- TC-003 (delete): click trash on a row -> card gone from grid; store save called with a
  deck lacking that card. Maps: AC-003.
- TC-004 (happy, add): type front + back in add-row -> commit -> deck gains one card (new
  id, given front/back); add-row inputs cleared; store save called. Maps: AC-004.
- TC-005 (add rejected): type only front (or only whitespace) -> commit -> no new card;
  typed text preserved; store save NOT called. Maps: AC-005.
- TC-006 (store save, in-memory): `save(deck)` overwrites the entry whose parsed id equals
  `deck.id`; a later `load()` returns the edited deck. Maps: AC-006.
- TC-007 (pure deck-ops): `withCardEdited` / `withCardAdded` / `withCardRemoved` return new
  decks with the expected cards and never mutate the input. Maps: AC-001/003/004.

## UI States

| State   | Behavior                                                                    |
| ------- | --------------------------------------------------------------------------- |
| Loading | Unchanged - grid renders once decks are loaded (existing async load).       |
| Empty   | Deck with no cards: only the trailing add-row renders; adding works.        |
| Error   | Store `save` failure is logged (mirrors settings-context); UI keeps optimistic value. |
| Success | Edited/added/deleted card reflected immediately; deck file rewritten.       |

## Data Model

No schema change. `Card = { id, front, back }`, `Deck = { id, name, cards }` unchanged.
New card id: `crypto.randomUUID()`.

## Edge Cases

- E-1: Edit to same value -> no write (AC-002).
- E-2: Add-row with one field empty / whitespace-only -> rejected, text kept (AC-005).
- E-3: Delete the only card -> deck persists with `cards: []`; add-row still works.
- E-4: Clearing an existing card's field to empty on edit -> allowed (persists empty
  string); only ADD requires both fields.
- E-5: Two decks that loaded from colliding slugs (`spanish`, `spanish-2`) -> save writes
  back to the exact slug each was loaded from (store tracks id -> slug), never re-derives
  onto the wrong file.
- E-6: Rapid successive edits -> whole-deck file rewritten each commit, last-write-wins
  (single-user, acceptable).

## Dependencies

- Reverses ADR 2026-07-17 read-only `CollectionStore`.
- Unblocks F2 (SRS review state), F3 (deck management), F6 (import) which all need a
  writable store.
