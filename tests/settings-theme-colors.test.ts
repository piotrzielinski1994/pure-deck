import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type Settings,
  type ThemeColors,
} from "@/lib/settings/settings";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";

describe("mergeSettings theme.colors validation (AC-008 / TC-011)", () => {
  it("should drop an unknown token and a numeric value but keep a valid oklch string", () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      theme: {
        mode: "dark",
        colors: {
          light: {
            tokens: {
              primary: "oklch(0.55 0.22 27)",
              background: 42,
              bogusToken: "oklch(0 0 0)",
            },
            editor: {
              keyword: "oklch(0.5 0.18 30)",
              bogusEditor: "oklch(0 0 0)",
              gutter: 7,
            },
          },
          dark: { tokens: {}, editor: {} },
        },
      },
    });

    expect(merged.theme.colors.light.tokens).toEqual({
      primary: "oklch(0.55 0.22 27)",
    });
    expect(merged.theme.colors.light.tokens).not.toHaveProperty("background");
    expect(merged.theme.colors.light.tokens).not.toHaveProperty("bogusToken");
    expect(merged.theme.colors.light.editor).toEqual({
      keyword: "oklch(0.5 0.18 30)",
    });
    expect(merged.theme.colors.light.editor).not.toHaveProperty("bogusEditor");
    expect(merged.theme.colors.light.editor).not.toHaveProperty("gutter");
  });

  it("should fall back to empty overrides if theme.colors is missing", () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { theme: { mode: "light" } });

    expect(merged.theme.colors).toEqual({
      light: { tokens: {}, editor: {} },
      dark: { tokens: {}, editor: {} },
    });
  });

  it("should fall back to empty overrides if theme.colors is invalid", () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      theme: { mode: "light", colors: "not-an-object" },
    });

    expect(merged.theme.colors).toEqual({
      light: { tokens: {}, editor: {} },
      dark: { tokens: {}, editor: {} },
    });
  });
});

describe("theme.colors settings-store round-trip (AC-008)", () => {
  it("should survive a save/load round-trip through merge validation if the diff is a valid sparse override", async () => {
    const colors: ThemeColors = {
      light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
      dark: { tokens: { background: "oklch(0.12 0 0)" }, editor: {} },
    };
    const saved: Settings = {
      ...DEFAULT_SETTINGS,
      theme: { ...DEFAULT_SETTINGS.theme, colors },
    };
    const store = createInMemorySettingsStore();

    await store.save(saved);
    const loaded = await store.load();
    const validated = mergeSettings(DEFAULT_SETTINGS, loaded);

    expect(validated.theme.colors).toEqual(colors);
  });
});
