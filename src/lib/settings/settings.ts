import type { SettingsStore as GenericSettingsStore } from "@pziel/pureui";

import {
  SHORTCUT_ACTIONS,
  type ShortcutActionId,
  type ShortcutOverrides,
} from "@/lib/shortcuts/registry";
import { safeNormalize } from "@/lib/shortcuts/resolve";

export type PanelGroupKey = "workspace";

export type PanelLayout = Record<string, number>;

export type ThemeMode = "light" | "dark" | "system";

export type AppTokenName =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "border"
  | "input"
  | "ring";

export type EditorTokenName =
  | "caret"
  | "selection"
  | "gutter"
  | "keyword"
  | "string"
  | "number"
  | "property"
  | "comment"
  | "invalid";

export type ThemeColorOverrides = {
  tokens: Partial<Record<AppTokenName, string>>;
  editor: Partial<Record<EditorTokenName, string>>;
};

export type ThemeColors = {
  light: ThemeColorOverrides;
  dark: ThemeColorOverrides;
};

export type FullThemeColorOverrides = {
  tokens: Record<AppTokenName, string>;
  editor: Record<EditorTokenName, string>;
};

export type FullThemeColors = {
  light: FullThemeColorOverrides;
  dark: FullThemeColorOverrides;
};

export type ThemeSettings = {
  mode: ThemeMode;
  colors: ThemeColors;
};

export function emptyThemeColors(): ThemeColors {
  return {
    light: { tokens: {}, editor: {} },
    dark: { tokens: {}, editor: {} },
  };
}

export type Settings = {
  version: 1;
  layouts: Partial<Record<PanelGroupKey, PanelLayout>>;
  sidebarCollapsed: boolean;
  openTabIds: string[];
  activeTabId: string | null;
  theme: ThemeSettings;
  shortcuts: ShortcutOverrides;
  collectionPath?: string;
  googleAccount?: { email: string };
};

export type SettingsStore = GenericSettingsStore<Settings>;

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  layouts: {},
  sidebarCollapsed: false,
  openTabIds: [],
  activeTabId: null,
  theme: { mode: "system", colors: emptyThemeColors() },
  shortcuts: {},
};

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

const APP_TOKEN_NAMES = new Set<string>([
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
]);

const EDITOR_TOKEN_NAMES = new Set<string>([
  "caret",
  "selection",
  "gutter",
  "keyword",
  "string",
  "number",
  "property",
  "comment",
  "invalid",
]);

const GROUP_KEYS: readonly PanelGroupKey[] = ["workspace"];

const ACTION_IDS = new Set<string>(SHORTCUT_ACTIONS.map((action) => action.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && THEME_MODES.includes(value as ThemeMode);
}

function parseGoogleAccount(value: unknown): Settings["googleAccount"] {
  if (!isRecord(value)) {
    return undefined;
  }
  const { email } = value;
  if (typeof email !== "string" || email.length === 0) {
    return undefined;
  }
  return { email };
}

function mergeLayouts(
  base: Settings["layouts"],
  persisted: unknown,
): Settings["layouts"] {
  if (!isRecord(persisted)) {
    return base;
  }
  const parsed = Object.fromEntries(
    GROUP_KEYS.flatMap((key) => {
      const group = persisted[key];
      if (!isRecord(group)) {
        return [];
      }
      const sizes = Object.entries(group).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      );
      return sizes.length > 0
        ? [[key, Object.fromEntries(sizes)] as const]
        : [];
    }),
  );
  return { ...base, ...parsed };
}

function mergeTokenMap<K extends string>(
  value: unknown,
  known: Set<string>,
): Partial<Record<K, string>> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [K, string] =>
        known.has(entry[0]) && typeof entry[1] === "string",
    ),
  ) as Partial<Record<K, string>>;
}

function mergeOverrides(value: unknown): ThemeColorOverrides {
  if (!isRecord(value)) {
    return { tokens: {}, editor: {} };
  }
  return {
    tokens: mergeTokenMap<AppTokenName>(value.tokens, APP_TOKEN_NAMES),
    editor: mergeTokenMap<EditorTokenName>(value.editor, EDITOR_TOKEN_NAMES),
  };
}

function mergeThemeColors(value: unknown): ThemeColors {
  if (!isRecord(value)) {
    return emptyThemeColors();
  }
  return {
    light: mergeOverrides(value.light),
    dark: mergeOverrides(value.dark),
  };
}

function mergeTheme(base: ThemeSettings, persisted: unknown): ThemeSettings {
  if (!isRecord(persisted)) {
    return base;
  }
  return {
    mode: isThemeMode(persisted.mode) ? persisted.mode : base.mode,
    colors: mergeThemeColors(persisted.colors),
  };
}

function mergeStringArray(base: string[], persisted: unknown): string[] {
  if (!Array.isArray(persisted)) {
    return base;
  }
  return persisted.filter((item): item is string => typeof item === "string");
}

function mergeShortcutValue(value: unknown): string[] | null {
  if (typeof value === "string") {
    const normalized = safeNormalize(value);
    return normalized === null ? null : [normalized];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  return value
    .map((entry) => (typeof entry === "string" ? safeNormalize(entry) : null))
    .filter((entry): entry is string => entry !== null);
}

function mergeShortcuts(persisted: unknown): ShortcutOverrides {
  if (!isRecord(persisted)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(persisted).flatMap(([id, value]) => {
      if (!ACTION_IDS.has(id)) {
        return [];
      }
      const merged = mergeShortcutValue(value);
      return merged === null ? [] : [[id as ShortcutActionId, merged] as const];
    }),
  );
}

export function mergeSettings(base: Settings, persisted: unknown): Settings {
  if (!isRecord(persisted)) {
    return base;
  }
  return {
    version: 1,
    layouts: mergeLayouts(base.layouts, persisted.layouts),
    sidebarCollapsed:
      typeof persisted.sidebarCollapsed === "boolean"
        ? persisted.sidebarCollapsed
        : base.sidebarCollapsed,
    openTabIds: mergeStringArray(base.openTabIds, persisted.openTabIds),
    activeTabId:
      typeof persisted.activeTabId === "string"
        ? persisted.activeTabId
        : base.activeTabId,
    theme: mergeTheme(base.theme, persisted.theme),
    shortcuts: mergeShortcuts(persisted.shortcuts),
    collectionPath:
      typeof persisted.collectionPath === "string"
        ? persisted.collectionPath
        : base.collectionPath,
    googleAccount:
      parseGoogleAccount(persisted.googleAccount) ?? base.googleAccount,
  };
}
