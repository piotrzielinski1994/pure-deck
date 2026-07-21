import type {
  AppTokenName,
  EditorTokenName,
  ThemeColorOverrides,
  ThemeColors,
} from "@/lib/settings/settings";
import { APP_TOKENS, EDITOR_TOKENS } from "@/lib/theme/theme-defaults";

const APP_TOKEN_SET = new Set<string>(APP_TOKENS);
const EDITOR_TOKEN_SET = new Set<string>(EDITOR_TOKENS);

function sameColor(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined || b === undefined) {
    return a === b;
  }
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

function mergeSection(
  overrides: ThemeColorOverrides,
  defaults: ThemeColorOverrides,
): ThemeColorOverrides {
  return {
    tokens: { ...defaults.tokens, ...overrides.tokens },
    editor: { ...defaults.editor, ...overrides.editor },
  };
}

export function applyDefaults(
  overrides: ThemeColors,
  defaults: ThemeColors,
): ThemeColors {
  return {
    light: mergeSection(overrides.light, defaults.light),
    dark: mergeSection(overrides.dark, defaults.dark),
  };
}

function diffMap<K extends string>(
  edited: Partial<Record<K, string>>,
  defaults: Partial<Record<K, string>>,
  known: Set<string>,
): Partial<Record<K, string>> {
  return Object.entries(edited).reduce<Partial<Record<K, string>>>(
    (acc, [key, value]) => {
      const name = key as K;
      if (
        !known.has(key) ||
        typeof value !== "string" ||
        sameColor(value, defaults[name])
      ) {
        return acc;
      }
      return { ...acc, [name]: value };
    },
    {},
  );
}

function diffSection(
  edited: ThemeColorOverrides,
  defaults: ThemeColorOverrides,
): ThemeColorOverrides {
  return {
    tokens: diffMap<AppTokenName>(edited.tokens, defaults.tokens, APP_TOKEN_SET),
    editor: diffMap<EditorTokenName>(
      edited.editor,
      defaults.editor,
      EDITOR_TOKEN_SET,
    ),
  };
}

export function diffOverrides(
  edited: ThemeColors,
  defaults: ThemeColors,
): ThemeColors {
  return {
    light: diffSection(edited.light, defaults.light),
    dark: diffSection(edited.dark, defaults.dark),
  };
}
