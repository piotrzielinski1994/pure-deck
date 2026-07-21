import { useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/theme-context";
import { useSettings } from "@/lib/settings/settings-context";
import type {
  ThemeColorOverrides,
  ThemeColors,
  ThemeMode,
} from "@/lib/settings/settings";
import { DEFAULT_THEME_COLORS } from "@/lib/theme/theme-defaults";
import { applyDefaults, diffOverrides } from "@/lib/theme/overrides";
import {
  makeJsonEditorExtensions,
  type EditorColors,
} from "@/lib/theme/editor-theme";

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

function isStringMap(slot: unknown): boolean {
  if (typeof slot !== "object" || slot === null || Array.isArray(slot)) {
    return false;
  }
  return Object.values(slot).every((entry) => typeof entry === "string");
}

function isOverridesShape(value: unknown): value is ThemeColorOverrides {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const { tokens, editor } = value as { tokens?: unknown; editor?: unknown };
  return isStringMap(tokens) && isStringMap(editor);
}

function parseThemeColors(text: string): ThemeColors | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { light, dark } = parsed as { light?: unknown; dark?: unknown };
    if (!isOverridesShape(light) || !isOverridesShape(dark)) {
      return null;
    }
    return parsed as ThemeColors;
  } catch {
    return null;
  }
}

function ColorEditor() {
  const { settings, saveThemeColors } = useSettings();
  const { effectiveMode, effectiveColors } = useTheme();
  const effective = applyDefaults(settings.theme.colors, DEFAULT_THEME_COLORS);
  const [text, setText] = useState(() => JSON.stringify(effective, null, 2));
  const parsed = parseThemeColors(text);
  const canSave = parsed !== null;

  const editorColors = effectiveColors[effectiveMode].editor as EditorColors;
  const isDark = effectiveMode === "dark";
  const extensions = useMemo(
    () => [
      Prec.highest(
        keymap.of([
          {
            key: "Mod-s",
            run: (view) => {
              const value = parseThemeColors(view.state.doc.toString());
              if (value) {
                saveThemeColors(diffOverrides(value, DEFAULT_THEME_COLORS));
              }
              return true;
            },
          },
        ]),
      ),
      ...makeJsonEditorExtensions(editorColors, isDark),
    ],
    [editorColors, isDark, saveThemeColors],
  );

  const save = () => {
    if (!parsed) {
      return;
    }
    saveThemeColors(diffOverrides(parsed, DEFAULT_THEME_COLORS));
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="h-72 min-h-0 border border-border">
        <CodeMirror
          value={text}
          onChange={setText}
          theme="none"
          extensions={extensions}
          height="100%"
          className="h-full text-xs"
          basicSetup={{ lineNumbers: false, foldGutter: false }}
        />
      </div>
      <div className="flex">
        <Button type="button" onClick={save} disabled={!canSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

export function ThemeSection() {
  const { mode, setMode } = useTheme();

  return (
    <section className="flex flex-col gap-1 p-6">
      <h2 className="text-lg font-medium">Theme</h2>
      <p className="text-sm text-muted-foreground">
        Choose the app appearance, or follow your OS preference.
      </p>
      <div className="mt-3 flex">
        {MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={mode === option.id}
            onClick={() => setMode(option.id)}
            className={cn(
              "border border-l-0 px-4 py-1.5 text-sm first:border-l hover:bg-accent",
              mode === option.id &&
                "bg-primary text-primary-foreground hover:brightness-90",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Customize colors per mode. Edit a value to override it, or set it back to
        the default to clear the override, then Save.
      </p>
      <ColorEditor />
    </section>
  );
}
