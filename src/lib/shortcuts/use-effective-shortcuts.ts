import { useContext } from "react";
import { DEFAULT_SETTINGS } from "@/lib/settings/settings";
import { SettingsContext } from "@/lib/settings/settings-context";
import type { ShortcutActionId } from "@/lib/shortcuts/registry";
import { resolveShortcuts } from "@/lib/shortcuts/resolve";

// App-side settings-read seam for the hoisted useActionHotkeys hook. Reads the
// user's shortcut overrides provider-tolerantly: falls back to
// DEFAULT_SETTINGS.shortcuts when no SettingsProvider is mounted (never throws),
// then resolves them to the effective binding map.
export function useEffectiveShortcuts(): Record<ShortcutActionId, string[]> {
  const context = useContext(SettingsContext);
  const shortcuts = context?.settings.shortcuts ?? DEFAULT_SETTINGS.shortcuts;
  return resolveShortcuts(shortcuts);
}
