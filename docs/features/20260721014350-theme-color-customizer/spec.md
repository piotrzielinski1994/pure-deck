# F9 - Per-mode theme color customization

Backlog: [.pzielinski/todos.md](../../../.pzielinski/todos.md) F9
Feature folder: `docs/features/20260721014350-theme-color-customizer/`

> **Port note.** Direct lift from the pure* family theme customizer (`purequery` / `purerequest`
> `src/lib/theme/`). Both apps share the same Tailwind-v4 token set, `:root`/`.dark` CSS shell, and
> settings-store. The color editor is a **CodeMirror JSON editor with syntax highlighting** - identical
> to purerequest - driven by 9 editor-syntax tokens (`caret`/`selection`/`gutter`/`keyword`/`string`/
> `number`/`property`/`comment`/`invalid`) per mode, via `@codemirror/lang-json` + a ported
> `editor-theme.ts` (`makeHighlight`/`makeChrome`).
>
> **Revision (2026-07-21).** An earlier cut of this feature shipped a plain `<textarea>` and dropped the
> editor-syntax tokens (reasoning: no code editor elsewhere in puredeck). The user required the JSON to be
> syntax-highlighted identically to purerequest, so both decisions were reversed: CodeMirror + the 9
> editor tokens are restored. Editor tokens are part of the persisted `theme.colors` shape (so they
> round-trip through the same sparse-diff store as the app tokens) and the settings-box highlighting reads
> the active mode's `editor` sub-map from `effectiveColors`.

## Overview

Today puredeck's theme is mode-only (Light / Dark / System) - `ThemeSection` flips `settings.theme.mode`
and nothing else. This feature adds a **per-mode color customizer**: the user can override any of the 18
CSS design tokens (`background`, `primary`, `border`, …) separately for light and dark mode, and reset
any of them back to the built-in default.

Persistence is **sparse-diff**: only tokens whose value differs from the built-in default are stored in
`settings.theme.colors`. An un-customized token tracks the built-in default forever; editing a token back
to its default value drops it from the store (a per-token reset). The active effective mode's overrides
are applied as **inline CSS vars** on `document.documentElement`, which beat the stylesheet `:root`/`.dark`
rules, so only overridden tokens need writing.

The customizer UI is a JSON `<textarea>` seeded with the full effective color set (defaults + current
overrides) for both modes, plus a Save button. Save parses the buffer, diffs it against the built-in
defaults, and persists only the diff. Invalid JSON disables Save so the store can never be corrupted.

Out of scope: a per-token color-picker/swatch grid (a bigger, different UI - the port mirrors purequery's
JSON-edit approach); editor-syntax colors (no code editor in puredeck); import/export of palettes; live
per-keystroke apply (apply happens on Save via the settings store, same as purequery).

## Acceptance Criteria

- AC-001: The Settings > Theme section renders a color customizer **below** the existing Light/Dark/System
  mode toggle. The toggle behavior is unchanged.
- AC-002: `DEFAULT_THEME_COLORS` is the single TS source of truth for the built-in colors: it lists all 18
  app tokens for **both** light and dark, and every app-token value mirrors `src/index.css` `:root` (light)
  and `.dark` (dark) verbatim (whitespace-insensitive), including the dark `border`/`input` alpha values.
  It also carries the 9 editor-syntax tokens per mode (the JSON-highlight scheme, lifted from purerequest);
  these are not tied to `index.css` (no code editor CSS in puredeck) but seed the settings-box highlighter.
- AC-003: `applyDefaults(sparse, defaults)` returns the **full** effective set - every default token, with
  the sparse overrides layered on top. A token absent from the overrides falls back to its default.
- AC-004: `diffOverrides(edited, defaults)` returns the **sparse** diff - only tokens differing from the
  default survive (whitespace-insensitive oklch compare), so a token edited back to its default drops out.
  Round-trip: `diffOverrides(applyDefaults(x, d), d)` deep-equals `x`.
- AC-005: Light and dark overrides are independent - overriding a token in one mode does not affect the
  other mode.
- AC-006: `applyThemeVars(el, mode, overrides)` sets an inline CSS var `--<token>` on `el` for each
  provided app token, and **clears** any app-token var not present in `overrides` (so a stale override from
  a previous mode/colors does not linger). Hyphenated tokens map to the dashed var (`card-foreground` →
  `--card-foreground`).
- AC-007: On mount and whenever the effective mode or `colors` change, `ThemeProvider` applies **only the
  active effective mode's** sparse overrides as inline vars on `document.documentElement`. Switching modes
  swaps which mode's overrides are applied.
- AC-008: `saveThemeColors(diff)` persists the sparse diff to `settings.theme.colors`, and it survives the
  settings-store round-trip. `mergeSettings` validates the loaded shape: unknown token names and non-string
  values are dropped; a missing/invalid `theme.colors` falls back to empty overrides.
- AC-009: The color editor seeds its buffer from the full effective set (defaults + current overrides).
  Editing a value and clicking Save persists the sparse diff. Invalid JSON disables Save (the store is
  never written with a bad value).
- AC-010: The customizer is usable at a 375px-wide viewport with touch: the textarea and Save button are
  visible and reachable (no horizontal-scroll trap, no hover/right-click dependency).

## User Test Cases

- TC-001 (defaults source of truth): read `DEFAULT_THEME_COLORS.light.tokens.background` → equals the
  `--background` value in `index.css` `:root`; same cross-check for a dark alpha token (`border`). Maps to: AC-002
- TC-002 (layer): `applyDefaults({light:{tokens:{primary:X}}, dark:{tokens:{}}}, defaults)` → light.primary
  is X, light.background is the default, all 18 tokens present. Maps to: AC-003
- TC-003 (diff drops equal): `diffOverrides` of an edited set equal to defaults → empty per-mode maps.
  Maps to: AC-004
- TC-004 (diff keeps changed): edit one light token → diff has exactly that one light token, dark empty.
  Maps to: AC-004
- TC-005 (round-trip): `diffOverrides(applyDefaults(sparse, d), d)` deep-equals `sparse`. Maps to: AC-004
- TC-006 (mode independence): override light.primary only → dark.primary stays default. Maps to: AC-005
- TC-007 (set var): `applyThemeVars(el, "light", {tokens:{primary:X}})` → `el.style` `--primary` === X.
  Maps to: AC-006
- TC-008 (clear stale var): apply `{primary:X}` then apply `{}` → `--primary` is cleared. Maps to: AC-006
- TC-009 (hyphen token): `applyThemeVars(el,"light",{tokens:{"card-foreground":X}})` → `--card-foreground`
  === X. Maps to: AC-006
- TC-010 (provider applies active mode): render `ThemeProvider` in dark mode with a dark `primary` override
  → `document.documentElement` inline `--primary` === the override; a light-only override is NOT applied.
  Maps to: AC-007
- TC-011 (merge validation): `mergeSettings` with `theme.colors` containing an unknown token and a numeric
  value → both dropped; a valid oklch string kept. Maps to: AC-008
- TC-012 (editor save persists diff): render ThemeSection, edit a token in the textarea, click Save → the
  store's `settings.theme.colors` holds exactly that sparse diff. Maps to: AC-009
- TC-013 (invalid JSON disables save): type invalid JSON in the textarea → Save button is disabled.
  Maps to: AC-009

## UI States

| State   | Behavior                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------- |
| Loading | N/A - settings are already loaded before `SettingsView` renders (provider gates on load).         |
| Empty   | No overrides: textarea shows the full default palette JSON; nothing to reset.                     |
| Error   | Invalid JSON in the buffer: Save disabled; the store is untouched; the on-screen theme unchanged. |
| Success | Valid buffer + Save: sparse diff persisted, inline vars re-applied, on-screen colors update.      |

### Wireframe - Settings > Theme (desktop and 375px are the same single-column layout)

```
+--------------------------------------------------------------+
| Theme  Shortcuts  Storage                                    |
+--------------------------------------------------------------+
|                                                              |
|  Theme                                                       |
|  Choose the app appearance, or follow your OS preference.    |
|                                                              |
|  +---------+ +---------+ +---------+                         |
|  |  Light  | |  Dark   | | System  |   <- mode toggle        |
|  +---------+ +---------+ +---------+                         |
|                                                              |
|  Customize colors per mode. Edit a value to override it, or  |
|  set it back to the default to clear the override, then Save.|
|                                                              |
|  +--------------------------------------------------------+  |
|  | {                                                      |  |
|  |   "light": {                                           |  |
|  |     "tokens": {                                        |  |
|  |       "background": "oklch(1 0 0)",                    |  |
|  |       "primary": "oklch(0.205 0 0)",                   |  |
|  |       ...                                              |  |
|  |     }                                                  |  |
|  |   },                                                   |  |
|  |   "dark": { "tokens": { ... } }                        |  |
|  | }                                                      |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  +--------+                                                  |
|  |  Save  |   <- disabled while JSON invalid                 |
|  +--------+                                                  |
|                                                              |
+--------------------------------------------------------------+
```

## Data Model

`settings.theme.colors` (sparse, persisted):

```ts
type AppTokenName =
  | "background" | "foreground" | "card" | "card-foreground"
  | "popover" | "popover-foreground" | "primary" | "primary-foreground"
  | "secondary" | "secondary-foreground" | "muted" | "muted-foreground"
  | "accent" | "accent-foreground" | "destructive" | "border" | "input" | "ring";

type EditorTokenName =
  | "caret" | "selection" | "gutter" | "keyword" | "string"
  | "number" | "property" | "comment" | "invalid";

type ThemeColorOverrides = {
  tokens: Partial<Record<AppTokenName, string>>;
  editor: Partial<Record<EditorTokenName, string>>;
};
type ThemeColors = { light: ThemeColorOverrides; dark: ThemeColorOverrides };
type FullThemeColors = {
  light: { tokens: Record<AppTokenName, string>; editor: Record<EditorTokenName, string> };
  dark: { tokens: Record<AppTokenName, string>; editor: Record<EditorTokenName, string> };
};

type ThemeSettings = { mode: ThemeMode; colors: ThemeColors };
```

Empty overrides (`{ light: { tokens: {}, editor: {} }, dark: { tokens: {}, editor: {} } }`) is the default
in `DEFAULT_SETTINGS`. `DEFAULT_THEME_COLORS: FullThemeColors` holds the built-in values (app tokens mirror
`index.css`; editor tokens are the purerequest JSON-highlight scheme). App-token overrides apply as inline
CSS vars; editor-token overrides drive the CodeMirror highlight in the settings box.

## Edge Cases

- Invalid JSON typed into the editor → Save disabled, store untouched (AC-009 / TC-013).
- A token edited to a whitespace-reformatted-but-equal oklch string → treated as equal, dropped from the
  diff (whitespace-insensitive compare, AC-004).
- Persisted `theme.colors` from a tampered/old file with unknown tokens or non-string values → dropped by
  `mergeSettings` validation (AC-008 / TC-011); the app never applies a garbage var.
- Overriding only one mode → the other mode's tokens all track defaults (AC-005 / TC-006).
- Switching effective mode (light↔dark, or OS pref change in system mode) → the previous mode's inline vars
  are cleared and the new mode's applied (AC-006 clear + AC-007).
- Dark `border`/`input` ship with an alpha channel (`oklch(1 0 0 / 10%)`) → must survive verbatim in
  defaults and round-trip (AC-002).

## Dependencies

New (to match purerequest's highlighted JSON editor): `@uiw/react-codemirror`, `@codemirror/lang-json`,
`@codemirror/language`, `@codemirror/view`, `@codemirror/state`, `@codemirror/lint`, `@lezer/highlight`
(same versions as purerequest). No color-picker library, no JSON-schema/intellisense infra is added (the
`codemirror-json-schema` piece purerequest uses is out of scope). Reuses `@/components/ui/button`, the
settings store, and the Tailwind token CSS.
