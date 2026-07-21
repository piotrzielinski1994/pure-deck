import { describe, expect, it } from "vitest";
import { applyDefaults, diffOverrides } from "@/lib/theme/overrides";
import type { ThemeColors } from "@/lib/settings/settings";

const DEFAULTS: ThemeColors = {
  light: {
    tokens: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      primary: "oklch(0.205 0 0)",
    },
    editor: {
      keyword: "oklch(0.5 0.18 30)",
      string: "oklch(0.5 0.13 145)",
    },
  },
  dark: {
    tokens: {
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
      primary: "oklch(0.922 0 0)",
    },
    editor: {
      keyword: "oklch(0.68 0.13 55)",
      string: "oklch(0.66 0.09 135)",
    },
  },
};

const emptyColors = (): ThemeColors => ({
  light: { tokens: {}, editor: {} },
  dark: { tokens: {}, editor: {} },
});

describe("applyDefaults (AC-003 / TC-002)", () => {
  it("should layer a sparse override over the defaults and keep every default token", () => {
    const sparse: ThemeColors = {
      light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    };

    const effective = applyDefaults(sparse, DEFAULTS);

    expect(effective.light.tokens.primary).toBe("oklch(0.55 0.22 27)");
    expect(effective.light.tokens.background).toBe(
      DEFAULTS.light.tokens.background,
    );
    expect(effective.light.tokens.foreground).toBe(
      DEFAULTS.light.tokens.foreground,
    );
    expect(Object.keys(effective.light.tokens).sort()).toEqual(
      Object.keys(DEFAULTS.light.tokens).sort(),
    );
  });

  it("should return the full default set if no overrides are present", () => {
    const effective = applyDefaults(emptyColors(), DEFAULTS);

    expect(effective.light.tokens).toEqual(DEFAULTS.light.tokens);
    expect(effective.dark.tokens).toEqual(DEFAULTS.dark.tokens);
  });
});

describe("applyDefaults mode independence (AC-005 / TC-006)", () => {
  it("should keep the two modes independent if only light is overridden", () => {
    const sparse: ThemeColors = {
      light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    };

    const effective = applyDefaults(sparse, DEFAULTS);

    expect(effective.light.tokens.primary).toBe("oklch(0.55 0.22 27)");
    expect(effective.dark.tokens.primary).toBe(DEFAULTS.dark.tokens.primary);
  });
});

describe("diffOverrides (AC-004 / TC-003 / TC-004)", () => {
  it("should return empty per-mode maps if the edited set equals the defaults", () => {
    const diff = diffOverrides(applyDefaults(emptyColors(), DEFAULTS), DEFAULTS);

    expect(diff.light.tokens).toEqual({});
    expect(diff.dark.tokens).toEqual({});
  });

  it("should keep only the one token that differs and leave the other mode empty", () => {
    const edited = applyDefaults(
      { light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} }, dark: { tokens: {}, editor: {} } },
      DEFAULTS,
    );

    const diff = diffOverrides(edited, DEFAULTS);

    expect(diff.light.tokens).toEqual({ primary: "oklch(0.55 0.22 27)" });
    expect(diff.light.tokens.background).toBeUndefined();
    expect(diff.dark.tokens).toEqual({});
  });

  it("should drop a token edited back to its built-in default", () => {
    const edited: ThemeColors = {
      light: { tokens: { primary: DEFAULTS.light.tokens.primary }, editor: {} },
      dark: { tokens: {}, editor: {} },
    };

    const diff = diffOverrides(edited, DEFAULTS);

    expect(diff.light.tokens.primary).toBeUndefined();
    expect(diff.light.tokens).toEqual({});
  });

  it("should drop a whitespace-reformatted-but-equal oklch value", () => {
    const edited: ThemeColors = {
      light: { tokens: { background: "oklch(1  0   0)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    };

    const diff = diffOverrides(edited, DEFAULTS);

    expect(diff.light.tokens.background).toBeUndefined();
  });

  it("should keep a genuinely different value after whitespace normalization", () => {
    const edited: ThemeColors = {
      light: { tokens: { background: "oklch(0.99 0 0)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    };

    const diff = diffOverrides(edited, DEFAULTS);

    expect(diff.light.tokens.background).toBe("oklch(0.99 0 0)");
  });
});

describe("diffOverrides / applyDefaults round-trip (AC-004 / TC-005)", () => {
  it("should deep-equal the original sparse set after a round-trip", () => {
    const sparse: ThemeColors = {
      light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
      dark: { tokens: { background: "oklch(0.12 0 0)" }, editor: {} },
    };

    const roundTripped = diffOverrides(
      applyDefaults(sparse, DEFAULTS),
      DEFAULTS,
    );

    expect(roundTripped).toEqual(sparse);
  });

  it("should round-trip an empty sparse set to empty", () => {
    const roundTripped = diffOverrides(
      applyDefaults(emptyColors(), DEFAULTS),
      DEFAULTS,
    );

    expect(roundTripped).toEqual(emptyColors());
  });
});
