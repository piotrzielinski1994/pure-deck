# F9 - Plan: Per-mode theme color customization

Derived from the approved [spec.md](spec.md). Port from the pure* theme customizer.

> **Revision 2026-07-21.** Original plan dropped editor tokens and used a `<textarea>`. Reversed: the color
> JSON must be syntax-highlighted identically to purerequest, so the 9 editor-syntax tokens are restored
> and the editor is CodeMirror (`@codemirror/lang-json` + ported `src/lib/theme/editor-theme.ts`). New CM
> deps added; `tests/setup.ts` gained `Range.getClientRects`/`getBoundingClientRect` stubs for CM under
> jsdom. `theme-section-colors.test.tsx` drives the live `EditorView` (`.cm-editor` + `dispatch`) instead
> of a textarea `fireEvent.change`.

Coverage threshold: none (no threshold enforced in `vitest.config.ts`).

## Design gate verdict

- **pz-ddd** - N/A. No domain model, aggregate, or bounded-context concern; this is presentation +
  settings persistence only.
- **pz-archetypes** - N/A. No accounting/inventory/ordering/pricing/party/plan-vs-execution shape.
- **pz-codebase-design** - applies (three new pure modules + one context extension), but the interfaces
  are already settled by the port source (purequery). We mirror them verbatim rather than re-deriving.
  Each module is a deep, single-responsibility unit (defaults table / layering / var application).

## File Structure

| File | Create/Modify | Responsibility |
| ---- | ------------- | -------------- |
| `src/lib/settings/settings.ts` | Modify | Add `AppTokenName`, `ThemeColorOverrides`, `ThemeColors`, `FullThemeColors`; extend `ThemeSettings` with `colors`; seed `DEFAULT_SETTINGS.theme.colors`; add `theme.colors` validation to `mergeSettings`. |
| `src/lib/theme/theme-defaults.ts` | Create | `APP_TOKENS: AppTokenName[]` + `DEFAULT_THEME_COLORS: FullThemeColors` mirroring `index.css`. |
| `src/lib/theme/overrides.ts` | Create | Pure `applyDefaults` (layer sparse over defaults) + `diffOverrides` (sparse diff, whitespace-insensitive compare). |
| `src/lib/theme/apply-vars.ts` | Create | Pure `applyThemeVars(el, mode, overrides)` - set/clear inline `--<token>` vars. |
| `src/lib/theme/theme-context.tsx` | Modify | Expose `colors`/`effectiveColors`/`setColors`; apply active mode's overrides via `applyThemeVars` in the existing layout effect. |
| `src/lib/settings/settings-context.tsx` | Modify | Add `saveThemeColors(colors)` mutator + expose on context. |
| `src/components/settings/theme-section.tsx` | Create | `ThemeSection` (mode toggle + `ColorEditor` textarea + Save). Extracted from `settings-view.tsx`. |
| `src/components/workspace/settings-view.tsx` | Modify | Replace the inline `ThemeSection` with an import of the new component. |
| `tests/theme-defaults.test.ts` | Create | AC-002. |
| `tests/theme-overrides.test.ts` | Create | AC-003/004/005. |
| `tests/apply-theme-vars.test.ts` | Create | AC-006. |
| `tests/theme-colors-context.test.tsx` | Create | AC-007. |
| `tests/settings-theme-colors.test.ts` | Create | AC-008. |
| `tests/theme-section-colors.test.tsx` | Create | AC-009. |

## Tasks

### Task 1: Settings model - theme color types + defaults + merge validation

**Files:** Modify `src/lib/settings/settings.ts`. Test `tests/settings-theme-colors.test.ts`.

**Interfaces:**
- Produces: `type AppTokenName` (18-member union), `type ThemeColorOverrides = { tokens: Partial<Record<AppTokenName,string>> }`, `type ThemeColors = { light: ThemeColorOverrides; dark: ThemeColorOverrides }`, `type FullThemeColors`, extended `ThemeSettings = { mode; colors: ThemeColors }`, `emptyThemeColors()`. `mergeSettings` validates `theme.colors`.
- Consumes: existing `ThemeMode`, `mergeSettings`, `DEFAULT_SETTINGS`.

- [ ] Failing test: `mergeSettings` with `theme.colors` holding an unknown token + numeric value drops both, keeps a valid oklch string; missing colors → empty overrides (AC-008/TC-011).
- [ ] Run, confirm FAIL.
- [ ] Add types, seed `DEFAULT_SETTINGS.theme.colors = emptyThemeColors()`, add `mergeThemeColors`/`mergeOverrides`/`mergeTokenMap` (app tokens only, no editor slot) to `mergeTheme`.
- [ ] Run, confirm PASS.
- [ ] Commit (`feat(F9): AC-008 theme color settings model + merge validation`).

### Task 2: theme-defaults - built-in color table

**Files:** Create `src/lib/theme/theme-defaults.ts`. Test `tests/theme-defaults.test.ts`.

**Interfaces:**
- Consumes: `AppTokenName`, `FullThemeColors` from Task 1.
- Produces: `APP_TOKENS: AppTokenName[]` (18), `DEFAULT_THEME_COLORS: FullThemeColors`.

- [ ] Failing test: `APP_TOKENS` has exactly the 18 names; `DEFAULT_THEME_COLORS` has all 18 in both modes as `oklch(...)` strings; light/dark values mirror `index.css` `:root`/`.dark` read off disk (incl. dark `border` alpha) (AC-002/TC-001).
- [ ] Run, confirm FAIL.
- [ ] Write the table (copy the 18 light + 18 dark values from `index.css`; no editor tokens).
- [ ] Run, confirm PASS.
- [ ] Commit (`feat(F9): AC-002 built-in theme color defaults`).

### Task 3: overrides - layer + sparse diff

**Files:** Create `src/lib/theme/overrides.ts`. Test `tests/theme-overrides.test.ts`.

**Interfaces:**
- Consumes: `AppTokenName`, `ThemeColorOverrides`, `ThemeColors` (Task 1); `APP_TOKENS` (Task 2).
- Produces: `applyDefaults(overrides: ThemeColors, defaults: ThemeColors): ThemeColors`, `diffOverrides(edited: ThemeColors, defaults: ThemeColors): ThemeColors`.

- [ ] Failing tests: layer (AC-003/TC-002), diff-drops-equal (TC-003), diff-keeps-changed (TC-004), round-trip (TC-005), mode independence (AC-005/TC-006), whitespace-insensitive equal drops.
- [ ] Run, confirm FAIL.
- [ ] Port `applyDefaults`/`diffOverrides`/`sameColor`/`mergeSection`/`diffSection` from purequery, deleting the `editor` slot everywhere.
- [ ] Run, confirm PASS.
- [ ] Commit (`feat(F9): AC-003/004/005 theme override layering + sparse diff`).

### Task 4: apply-vars - inline CSS var application

**Files:** Create `src/lib/theme/apply-vars.ts`. Test `tests/apply-theme-vars.test.ts`.

**Interfaces:**
- Consumes: `AppTokenName`, `ThemeColorOverrides` (Task 1); `APP_TOKENS` (Task 2).
- Produces: `applyThemeVars(el: HTMLElement, mode: "light"|"dark", colors: ThemeColorOverrides): void`.

- [ ] Failing tests: set var (TC-007), clear stale var (TC-008), hyphen token (TC-009), does not set un-overridden vars, swap set/clear (AC-006).
- [ ] Run, confirm FAIL.
- [ ] Port `applyThemeVars` (iterate `APP_TOKENS`; set or `removeProperty`). Drop the editor comment/behavior.
- [ ] Run, confirm PASS.
- [ ] Commit (`feat(F9): AC-006 apply theme overrides as inline CSS vars`).

### Task 5: settings-context - saveThemeColors mutator

**Files:** Modify `src/lib/settings/settings-context.tsx`. Covered by Task 6's context test.

**Interfaces:**
- Consumes: `ThemeColors` (Task 1).
- Produces: `saveThemeColors: (colors: ThemeColors) => void` on the settings context value.

- [ ] (No standalone test - exercised through Task 6 provider test + Task 7 editor test.)
- [ ] Add `saveThemeColors` via `update((base)=>({...base, theme:{...base.theme, colors}}))`; add to the value + deps.
- [ ] Commit folded into Task 6.

### Task 6: theme-context - expose + apply colors

**Files:** Modify `src/lib/theme/theme-context.tsx`. Test `tests/theme-colors-context.test.tsx`.

**Interfaces:**
- Consumes: `saveThemeColors` (Task 5); `applyDefaults` (Task 3); `applyThemeVars` (Task 4); `DEFAULT_THEME_COLORS` (Task 2).
- Produces: `useTheme()` gains `colors`, `effectiveColors`, `setColors`.

- [ ] Failing test: mount `ThemeProvider` in dark mode with a dark `primary` override → `document.documentElement` inline `--primary` === override; a light-only override is NOT applied in dark mode (AC-007/TC-010).
- [ ] Run, confirm FAIL.
- [ ] Add `colors`/`effectiveColors` (memo `applyDefaults(colors, DEFAULT_THEME_COLORS)`); in the existing dark-class layout effect also call `applyThemeVars(documentElement, effectiveMode, colors[effectiveMode])`; extend the context value. Keep `useTheme` throwing.
- [ ] Run, confirm PASS.
- [ ] Commit (`feat(F9): AC-007 apply per-mode color overrides in ThemeProvider`).

### Task 7: ThemeSection - extract + JSON textarea color editor

**Files:** Create `src/components/settings/theme-section.tsx`; modify `src/components/workspace/settings-view.tsx`. Test `tests/theme-section-colors.test.tsx`.

**Interfaces:**
- Consumes: `useSettings().saveThemeColors` (Task 5); `useTheme()` colors (Task 6); `applyDefaults`/`diffOverrides` (Task 3); `DEFAULT_THEME_COLORS` (Task 2); existing `Button`.
- Produces: `ThemeSection` component (exported), imported by `settings-view.tsx`.

- [ ] Failing tests: edit a token in the textarea + Save → store `theme.colors` holds exactly the sparse diff (AC-009/TC-012); invalid JSON → Save disabled (TC-013).
- [ ] Run, confirm FAIL.
- [ ] Extract the existing mode-toggle `ThemeSection` into the new file; add a `ColorEditor` sub-component: `<textarea>` seeded from `JSON.stringify(applyDefaults(colors, DEFAULT_THEME_COLORS), null, 2)`, controlled state, `parseThemeColors` guard, Save = `saveThemeColors(diffOverrides(parsed, DEFAULT_THEME_COLORS))`, Save disabled when parse fails. Replace the inline section in `settings-view.tsx` with the import.
- [ ] Run, confirm PASS.
- [ ] Commit (`feat(F9): AC-001/009/010 theme color customizer UI`).

## Approach & key decisions

- **Sparse-diff persistence** (port verbatim): store only tokens differing from the built-in default; an
  un-customized token tracks the default and editing back to default clears it. Mirrors purequery so the
  persisted shape is compatible.
- **Editor tokens dropped**: puredeck has no code editor, so the 9 syntax tokens and the `editor` sub-map
  are removed from every type, the defaults table, and the diff/apply logic. YAGNI.
- **Textarea over CodeMirror**: no CodeMirror/JSON-schema infra in puredeck; a `<textarea>` needs zero new
  deps, is touch-first / mobile-viable (CLAUDE.md, AC-010), and keeps the same JSON-edit + Save UX.
- **Inline vars on documentElement**: an inline var beats the `:root`/`.dark` stylesheet rule, so only
  overridden tokens are written and the rest inherit the CSS defaults. Cleared tokens are `removeProperty`.

## Edge cases handled (from spec)

Invalid JSON (Save disabled, store untouched); whitespace-equal oklch dropped from diff; tampered persisted
colors (unknown token / non-string dropped by merge); one-mode-only override (other tracks defaults);
effective-mode switch clears prior mode's vars; dark alpha tokens survive verbatim.

## Tests to write (one+ per AC)

| AC | Test file | Test |
| -- | --------- | ---- |
| AC-002 | tests/theme-defaults.test.ts | 18 tokens both modes, mirror index.css incl. dark alpha |
| AC-003 | tests/theme-overrides.test.ts | applyDefaults layers + full set |
| AC-004 | tests/theme-overrides.test.ts | diff drops equal / keeps changed / round-trip |
| AC-005 | tests/theme-overrides.test.ts | mode independence |
| AC-006 | tests/apply-theme-vars.test.ts | set / clear / hyphen / swap |
| AC-007 | tests/theme-colors-context.test.tsx | provider applies active mode only |
| AC-008 | tests/settings-theme-colors.test.ts | merge validation + round-trip |
| AC-009 | tests/theme-section-colors.test.tsx | save persists diff / invalid disables save |
| AC-001, AC-010 | tests/theme-section-colors.test.tsx + live verify @375px | section renders below toggle, touch-usable |

## Acceptance verification

- All tasks green via `npm test` (Vitest).
- Live verify in the running app at desktop + 375px: edit a token, Save, confirm the on-screen color
  changes and that the textarea + Save button are reachable at 375px (AC-010). Reset a token to default,
  Save, confirm it drops from the store (`settings.theme.colors`).
