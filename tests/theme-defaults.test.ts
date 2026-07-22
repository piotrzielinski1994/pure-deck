/// <reference types="node" />
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import type { AppTokenName, FullThemeColors } from "@/lib/settings/settings";
import { APP_TOKENS, DEFAULT_THEME_COLORS } from "@/lib/theme/theme-defaults";

// The canonical :root/.dark tokens live in @pziel/pureui/styles/theme.css
// (imported by src/index.css); read it off disk to cross-check the built-in
// defaults against the real CSS.
const nodeRequire = createRequire(import.meta.url);
const indexCss = readFileSync(
  nodeRequire.resolve("@pziel/pureui/styles/theme.css"),
  "utf8",
);

const EXPECTED_APP_TOKENS: AppTokenName[] = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
];

function cssVar(block: ":root" | ".dark", token: string): string {
  const start = indexCss.indexOf(`${block} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const body = indexCss.slice(start).split("}")[0];
  const match = body.match(new RegExp(`--${token}:\\s*([^;]+);`));
  expect(match).not.toBeNull();
  return (match?.[1] ?? "").trim();
}

const norm = (value: string): string => value.replace(/\s+/g, " ").trim();

describe("APP_TOKENS (AC-002 / TC-001)", () => {
  it("should list exactly the 18 known app token names", () => {
    expect([...APP_TOKENS].sort()).toEqual([...EXPECTED_APP_TOKENS].sort());
    expect(APP_TOKENS).toHaveLength(18);
  });
});

describe("DEFAULT_THEME_COLORS shape (AC-002)", () => {
  const modes: (keyof FullThemeColors)[] = ["light", "dark"];

  modes.forEach((mode) => {
    it(`should have all 18 app tokens as oklch strings for ${mode} mode`, () => {
      expect(Object.keys(DEFAULT_THEME_COLORS[mode].tokens).sort()).toEqual(
        [...EXPECTED_APP_TOKENS].sort(),
      );
      EXPECTED_APP_TOKENS.forEach((token) => {
        expect(DEFAULT_THEME_COLORS[mode].tokens[token]).toBeTypeOf("string");
        expect(DEFAULT_THEME_COLORS[mode].tokens[token]).toMatch(
          /^oklch\(.+\)$/,
        );
      });
    });
  });
});

describe("DEFAULT_THEME_COLORS mirrors index.css (AC-002 / TC-001)", () => {
  it("should mirror the :root --background for the light background token", () => {
    expect(norm(DEFAULT_THEME_COLORS.light.tokens.background)).toBe(
      norm(cssVar(":root", "background")),
    );
  });

  it("should mirror every :root value for every light token", () => {
    EXPECTED_APP_TOKENS.forEach((token) => {
      expect(norm(DEFAULT_THEME_COLORS.light.tokens[token])).toBe(
        norm(cssVar(":root", token)),
      );
    });
  });

  it("should mirror every .dark value for every dark token", () => {
    EXPECTED_APP_TOKENS.forEach((token) => {
      expect(norm(DEFAULT_THEME_COLORS.dark.tokens[token])).toBe(
        norm(cssVar(".dark", token)),
      );
    });
  });

  it("should preserve the .dark --border alpha value verbatim", () => {
    expect(norm(DEFAULT_THEME_COLORS.dark.tokens.border)).toBe(
      norm(cssVar(".dark", "border")),
    );
    expect(norm(DEFAULT_THEME_COLORS.dark.tokens.border)).toBe(
      "oklch(1 0 0 / 10%)",
    );
  });
});
