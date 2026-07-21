# puredeck

A keyboard-driven, file-based desktop flashcards app - an open alternative to Anki.

Built as a Tauri 2 desktop shell (Rust backend, native webview) with a React 19 + TypeScript frontend, the TanStack stack (Router/Query/Hotkeys), and shadcn/ui on Tailwind CSS v4. The UI is a requi-style workspace shell: a resizable, collapsible deck sidebar beside a tabbed content area (deck / study / settings), with a persisted theme (light/dark/system, plus per-mode color customization). Below a 768px viewport it switches to a touch-first mobile layout - a top bar with a hamburger-opened deck drawer and a command-palette button - so it works on phones (Android/iOS), not just desktop.

## Prerequisites

- **Node.js** - version pinned in [mise.toml](mise.toml) (24). This machine manages node via `mise`; run `mise use` or `eval "$(mise activate bash)"` before npm.
- **Rust** - stable toolchain (`rustc`/`cargo`), required by Tauri.
- **Tauri OS prerequisites** - platform build tools per the [Tauri 2 prerequisites guide](https://v2.tauri.app/start/prerequisites/) (on macOS: Xcode Command Line Tools).

## Setup

```bash
mise install     # installs the pinned Node toolchain
npm install
```

## Commands

| Command | Description |
| --- | --- |
| `npm start` | Launch the native desktop app (`tauri dev`). |
| `npm run dev` | Vite dev server only (browser, no native shell). |
| `npm run build` | Typecheck + build the frontend bundle. |
| `npm run tauri build` | Build the distributable desktop app. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run lint` | ESLint over the repo. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run format` | Prettier write over `src`/`tests`. |

## Repo layout

```
src/                    React app: main entry, router, routes, components, lib
src-tauri/              Tauri desktop shell (Rust backend, tauri.conf.json, commands)
tests/                  Vitest setup + smoke specs
public/                 static assets served by Vite
docs/                   spec/plan per feature, ADR, learnings, glossary
```

## On-disk state (packaged app)

Under the OS app-data dir:

- `settings.json` - panel layout, sidebar-collapsed, open tabs, theme mode + per-mode color overrides (sparse: only tokens differing from the built-in default; customized in Settings > Theme), the optional `collectionPath` (custom deck folder; unset = default app-data `collections/`), and the optional `googleAccount` (`{ email }`; the display cache for a connected Google Drive account - the OAuth refresh token is never stored here, only in the OS keychain).
- `keymap.json` - keyboard shortcut overrides (`actionId -> hotkey[]`); an action can hold several bindings, an empty list disables it, and a missing entry falls back to the registry default. Rebind, add, remove, and reset bindings in Settings > Shortcuts.
- `collections/<deck-slug>.json` - one JSON file per deck (id, name, cards). Read on launch; hand-editable. Any empty deck folder is seeded with one demo deck on first load. On desktop the deck folder is configurable in Settings > Storage (any path); picking a folder reloads decks in place and the choice survives restarts. Cards are editable in-app (add / edit / delete); each change rewrites the deck's file. Whole decks are also managed in-app: create (right-click the deck list -> New deck, or the "New deck" command), rename (deck row context menu -> inline edit), and delete (context menu or "Delete deck" command, with a confirm dialog) - deleting removes the deck's file.
- `review-state.json` - per-card SRS scheduling state (FSRS-6: stability, difficulty, due, state, reps, lapses), keyed by card id, kept separate from deck content. Study grades (Again/Hard/Good/Easy) reschedule the card via the `ts-fsrs` library; the study session shows only due cards.
- `review-log.json` - append-only review history (one entry per grade), the training input for a future FSRS optimizer / stats.
