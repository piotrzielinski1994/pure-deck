import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  type PanelGroupKey,
  type PanelLayout,
  type Settings,
  type SettingsStore,
  type ThemeMode,
} from "@/lib/settings/settings";
import type { ShortcutActionId } from "@/lib/shortcuts/registry";
import { resolveShortcuts, safeNormalize } from "@/lib/shortcuts/resolve";

type SettingsContextValue = {
  settings: Settings;
  saveLayout: (group: PanelGroupKey, layout: PanelLayout) => void;
  saveSidebarCollapsed: (collapsed: boolean) => void;
  saveOpenTabs: (openTabIds: string[], activeTabId: string | null) => void;
  saveThemeMode: (mode: ThemeMode) => void;
  addShortcut: (id: ShortcutActionId, hotkey: string) => void;
  removeShortcut: (id: ShortcutActionId, hotkey: string) => void;
  replaceShortcut: (
    id: ShortcutActionId,
    oldHotkey: string,
    newHotkey: string,
  ) => void;
  resetShortcut: (id: ShortcutActionId) => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

type SettingsProviderProps = {
  store: SettingsStore;
  children: ReactNode;
};

export function SettingsProvider({ store, children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let isMounted = true;
    store.load().then((loaded) => {
      if (isMounted) {
        setSettings(loaded);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [store]);

  const update = useCallback(
    (mutate: (base: Settings) => Settings) => {
      setSettings((current) => {
        const next = mutate(current ?? DEFAULT_SETTINGS);
        store.save(next);
        return next;
      });
    },
    [store],
  );

  const saveLayout = useCallback(
    (group: PanelGroupKey, layout: PanelLayout) =>
      update((base) => ({
        ...base,
        layouts: { ...base.layouts, [group]: layout },
      })),
    [update],
  );

  const saveSidebarCollapsed = useCallback(
    (collapsed: boolean) =>
      update((base) => ({ ...base, sidebarCollapsed: collapsed })),
    [update],
  );

  const saveOpenTabs = useCallback(
    (openTabIds: string[], activeTabId: string | null) =>
      update((base) => ({ ...base, openTabIds, activeTabId })),
    [update],
  );

  const saveThemeMode = useCallback(
    (mode: ThemeMode) =>
      update((base) => ({ ...base, theme: { ...base.theme, mode } })),
    [update],
  );

  const addShortcut = useCallback(
    (id: ShortcutActionId, hotkey: string) =>
      update((base) => {
        const normalized = safeNormalize(hotkey);
        if (normalized === null) {
          return base;
        }
        const current = resolveShortcuts(base.shortcuts)[id];
        if (current.includes(normalized)) {
          return base;
        }
        return {
          ...base,
          shortcuts: { ...base.shortcuts, [id]: [...current, normalized] },
        };
      }),
    [update],
  );

  const removeShortcut = useCallback(
    (id: ShortcutActionId, hotkey: string) =>
      update((base) => {
        const normalized = safeNormalize(hotkey) ?? hotkey;
        const current = resolveShortcuts(base.shortcuts)[id];
        return {
          ...base,
          shortcuts: {
            ...base.shortcuts,
            [id]: current.filter((binding) => binding !== normalized),
          },
        };
      }),
    [update],
  );

  const replaceShortcut = useCallback(
    (id: ShortcutActionId, oldHotkey: string, newHotkey: string) =>
      update((base) => {
        const normalizedNew = safeNormalize(newHotkey);
        if (normalizedNew === null) {
          return base;
        }
        const normalizedOld = safeNormalize(oldHotkey) ?? oldHotkey;
        const current = resolveShortcuts(base.shortcuts)[id];
        if (!current.includes(normalizedOld)) {
          return base;
        }
        const swapped = current.map((binding) =>
          binding === normalizedOld ? normalizedNew : binding,
        );
        return {
          ...base,
          shortcuts: {
            ...base.shortcuts,
            [id]: swapped.filter(
              (binding, index) => swapped.indexOf(binding) === index,
            ),
          },
        };
      }),
    [update],
  );

  const resetShortcut = useCallback(
    (id: ShortcutActionId) =>
      update((base) => ({
        ...base,
        shortcuts: Object.fromEntries(
          Object.entries(base.shortcuts).filter(([key]) => key !== id),
        ),
      })),
    [update],
  );

  const value = useMemo<SettingsContextValue | null>(() => {
    if (!settings) {
      return null;
    }
    return {
      settings,
      saveLayout,
      saveSidebarCollapsed,
      saveOpenTabs,
      saveThemeMode,
      addShortcut,
      removeShortcut,
      replaceShortcut,
      resetShortcut,
    };
  }, [
    settings,
    saveLayout,
    saveSidebarCollapsed,
    saveOpenTabs,
    saveThemeMode,
    addShortcut,
    removeShortcut,
    replaceShortcut,
    resetShortcut,
  ]);

  if (!value) {
    return null;
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return value;
}
