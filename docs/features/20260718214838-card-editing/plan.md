# F1 - In-app card editing - Plan

Coverage threshold: none. React 19 (ref is a prop, `use(Context)` available).

## Decision Log

| Date       | Decision | Rationale |
| ---------- | -------- | --------- |
| 2026-07-18 | Design gate: evaluated pz-ddd / pz-archetypes / pz-codebase-design. Invoked pz-codebase-design (mentally). | pz-codebase-design applies: reshaping the `CollectionStore` port (add `save`) and the grid->context->store mutation seam. pz-ddd light: Deck is a whole-file aggregate saved atomically, no new context. pz-archetypes: none - card CRUD matches no archetype shape. |
| 2026-07-18 | Save-on-blur (not debounced/explicit button). | Spreadsheet-cell feel, no debounce/timer to stub, one write per committed cell. |
| 2026-07-18 | Delete is immediate, no confirm. | Single-card action, grid re-render is the feedback; matches inline-edit snappiness. |
| 2026-07-18 | Add-row requires BOTH front and back (trimmed) non-empty. | User choice; prevents phantom half-cards from stray focus. |
| 2026-07-18 | Tauri store tracks a deckId -> slug map at load time; `save` writes back to that exact slug. | Load discards the filename today; without the map, save would re-derive a slug and could clobber a colliding file (E-5). |
| 2026-07-18 | Card mutations are pure functions in `deck-ops.ts`; context owns state + persistence. | Keeps ifology out of the grid; deck-ops unit-testable without React or a store. |
| 2026-07-18 | New card id via `crypto.randomUUID()`. | Available in webview + jsdom; no new dep, collision-safe (vs. slug-style ids). |

## File Structure

- `src/lib/workspace/deck-ops.ts` (**new**) - pure: `withCardEdited`, `withCardAdded`, `withCardRemoved`.
- `src/lib/workspace/collection.ts` (**modify**) - add `save` to `CollectionStore` type.
- `src/lib/workspace/in-memory-collection.ts` (**modify**) - implement `save` (overwrite entry by deck id, matched via `parseDeck`).
- `src/lib/workspace/tauri-collection.ts` (**modify**) - track `id -> slug` on load; implement `save` writing that slug's file.
- `src/components/workspace/workspace-context.tsx` (**modify**) - expose `saveDeck(deck)`: update local decks + call `store.save`.
- `src/components/workspace/card-grid.tsx` (**modify**) - controlled: `onEditCard`, `onRemoveCard`, `onAddCard` callbacks; local state for the add-row.
- `src/components/workspace/deck-view.tsx` (**modify**) - thread deck-ops through context `saveDeck` into `CardGrid`.
- `src/components/workspace/main.tsx` (**modify**) - pass `saveDeck` wiring to `DeckView`.
- `README.md` (**modify**) - drop the "no in-app deck editing yet" caveat.
- `docs/adr.md` (**modify**) - append: read-only store reversed by F1.

Tests (new/modified):
- `tests/deck-ops.test.ts` (**new**) - TC-007.
- `tests/collection-store.test.ts` (**modify**) - TC-006 (in-memory save round-trip).
- `tests/card-grid.test.tsx` (**new**) - TC-001..TC-005 (controlled callbacks).
- `tests/deck-view.test.tsx` (**modify**) - keep existing render assertions green under new prop shape.

## Tasks

### Task 1: Pure deck-ops module

**Files:** Create `src/lib/workspace/deck-ops.ts`; Test `tests/deck-ops.test.ts`.

**Interfaces:**
- Produces:
  - `withCardEdited(deck: Deck, cardId: string, patch: Partial<Pick<Card, "front" | "back">>): Deck`
  - `withCardAdded(deck: Deck, front: string, back: string): Deck` (caller pre-validates non-empty; id via `crypto.randomUUID()`)
  - `withCardRemoved(deck: Deck, cardId: string): Deck`
  - All return new `Deck`/`Card` objects; input never mutated.

- [ ] Write failing test (TC-007): edit/add/remove return expected cards + input unchanged.
- [ ] Run, confirm FAILS (module missing).
- [ ] Implement with `map`/`filter`/spread.
- [ ] Run, confirm PASSES.
- [ ] Commit (`feat(card-editing): AC-001/003/004 pure deck card ops`).

### Task 2: Writable CollectionStore (port + both adapters)

**Files:** Modify `collection.ts`, `in-memory-collection.ts`, `tauri-collection.ts`; Test `tests/collection-store.test.ts`.

**Interfaces:**
- Consumes: `parseDeck`, `serializeDeck`, `slugify`, `uniqueSlug`.
- Produces: `CollectionStore.save(deck: Deck): Promise<void>`.
  - In-memory: overwrite the file entry whose `parseDeck(...).id === deck.id`; if none, add under a fresh unique slug.
  - Tauri: keep a `Map<deckId, slug>` populated on load; `save` writes `serializeDeck(deck)` to `${root}/${slug}.json`; unknown id -> derive via `uniqueSlug(slugify(deck.name), knownSlugs)`.

- [ ] Write failing test (TC-006): in-memory `save` then `load` returns edited deck.
- [ ] Run, confirm FAILS.
- [ ] Add `save` to type + both adapters.
- [ ] Run, confirm PASSES.
- [ ] Commit (`feat(card-editing): AC-006 writable CollectionStore.save`).

### Task 3: Workspace context saveDeck

**Files:** Modify `workspace-context.tsx`.

**Interfaces:**
- Consumes: `CollectionStore.save`, deck-ops (via callers).
- Produces: `saveDeck(deck: Deck): void` on `WorkspaceContextValue` - replaces the deck in local state by id and calls `store.save(deck)` (fire-and-forget, error logged).
  - Local state must exist even when `decksProp` is set so edits reflect; seed state from `decksProp ?? loadedDecks`. Keep `decks` reading from that single state.

- [ ] (Covered by Task 5 grid tests through DeckView + injected store; no standalone test - context is a thin pass-through.)
- [ ] Implement `saveDeck`; adjust decks state seeding.
- [ ] Commit folded into Task 5.

### Task 4: Controlled CardGrid

**Files:** Modify `card-grid.tsx`; Test `tests/card-grid.test.tsx`.

**Interfaces:**
- Consumes: nothing new.
- Produces: `CardGrid` props `{ cards, onEditCard(id, patch), onRemoveCard(id), onAddCard(front, back) }`.
  - Existing-card inputs: `defaultValue` + `onBlur` -> compare to current, call `onEditCard` only if changed (AC-001/002/E-4).
  - Trash button: `onClick` -> `onRemoveCard(id)` (AC-003).
  - Add-row: local `useState` for front/back; on blur/Enter of the row, if both trimmed non-empty -> `onAddCard`, clear inputs; else keep text (AC-004/005).

- [ ] Write failing tests (TC-001..005) with spy callbacks.
- [ ] Run, confirm FAIL.
- [ ] Implement controlled grid.
- [ ] Run, confirm PASS.
- [ ] Commit (`feat(card-editing): AC-001..005 controlled card grid`).

### Task 5: Wire DeckView -> context

**Files:** Modify `deck-view.tsx`, `main.tsx`, `workspace-context.tsx` (Task 3); Test `tests/deck-view.test.tsx`.

**Interfaces:**
- Consumes: `useWorkspace().saveDeck`, deck-ops.
- Produces: `DeckView` builds grid callbacks from `saveDeck(withCardEdited(...))` etc.

- [ ] Update `deck-view.test.tsx` to the new prop shape; keep render assertions green.
- [ ] Implement wiring; `main.tsx` passes nothing extra (DeckView reads context) or threads `saveDeck` prop - pick the pattern matching `onStudy`.
- [ ] Run full suite green.
- [ ] Commit (`feat(card-editing): AC-001/003/004 wire deck editing through workspace`).

### Task 6: Docs

**Files:** Modify `README.md`, `docs/adr.md`.

- [ ] Drop README read-only caveat; add ADR reversal line.
- [ ] Commit (`docs(card-editing): retire read-only-store caveat`).

## Edge cases (from spec)

E-1 no-op edit, E-2 add rejected, E-3 delete last card, E-4 clear existing field allowed,
E-5 slug-collision write-back, E-6 last-write-wins. E-1/E-2/E-4 covered by grid tests;
E-3 by deck-ops; E-5 by tauri map (manual-reasoned, tauri fs not unit-tested per existing
convention - only in-memory adapter has tests).

## Risks

- Tauri `save` not unit-tested (no tauri fs in jsdom, matches existing `collection-store.test.ts` which only tests in-memory): mitigate by keeping tauri `save` a thin slug-lookup + `writeTextFile`, and mirroring the tested in-memory semantics.
- `decksProp` escape hatch vs. local state: seeding state from prop could desync if a test passes new `decksProp`; mitigate by keeping `decks` derived from one state source and documenting decksProp as initial-seed-only.

## AC traceability (verified)

| AC | Behavior | Proving tests |
| -- | -------- | ------------- |
| AC-001 | edit persists + updates grid | card-grid "should call onEditCard...new front"; deck-view "should save the deck with the edited card front..."; deck-ops withCardEdited |
| AC-002 | unchanged edit = no write | card-grid "should not call onEditCard if...without a value change" |
| AC-003 | delete removes + persists | card-grid "should call onRemoveCard..."; deck-view "should save the deck without the removed card..."; deck-ops withCardRemoved |
| AC-004 | add both fields -> new card, cleared inputs | card-grid "should call onAddCard with the trimmed front and back..."; deck-view "should save the deck with a new card and clear the add-row..."; deck-ops withCardAdded (fresh id) |
| AC-005 | add rejected if a field empty/ws | card-grid "should not call onAddCard if...back is empty..." + "...whitespace-only" |
| AC-006 | CollectionStore.save | collection-store "should overwrite the matching entry so a later load returns the edited deck" (in-memory); tauri adapter slug-map reviewed by inspection (no fs in jsdom, per convention) |

E-4 (clear existing field to empty allowed) covered by deck-view "should save the deck with the edited card front cleared to empty on edit".

## Status: DONE (branch, not merged)

- All 6 ACs PASS (verifier + fresh re-run). Gates: 123/123 tests, tsc 0 errors, eslint 0 errors (6 pre-existing warnings).
- Live-verified in webview (Playwright): edit hola->buenos (back kept), add rojo/red (5->6, add-row cleared), delete rojo (6->5). Desktop + 375px mobile screenshots in `.pzielinski/card-editing/`.
- Follow-up (out of scope, pre-existing): row trash cell is 36px, below the 44px touch-target guideline; F1 did not change grid sizing.

## Plan self-review

- Coverage: AC-001->TC-001, AC-002->TC-002, AC-003->TC-003, AC-004->TC-004, AC-005->TC-005, AC-006->TC-006; deck-ops purity TC-007. All ACs covered.
- Interface consistency: `withCardEdited/Added/Removed`, `save(deck)`, `saveDeck(deck)`, grid `onEditCard/onRemoveCard/onAddCard` used identically across tasks.
- Scope: card CRUD only; deck CRUD deferred to F3. Single-ticket-sized.
