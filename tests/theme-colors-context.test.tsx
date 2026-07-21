import { afterEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type ThemeColors,
  type ThemeMode,
} from "@/lib/settings/settings";
import { ThemeProvider } from "@/lib/theme/theme-context";

type MediaListener = (event: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<MediaListener>();
  const mql = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      listeners.delete(listener);
    },
    addListener: (listener: MediaListener) => listeners.add(listener),
    removeListener: (listener: MediaListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };
  window.matchMedia = ((query: string) => {
    void query;
    return mql;
  }) as unknown as typeof window.matchMedia;
}

const DARK_PRIMARY = "oklch(0.33 0.11 250)";
const LIGHT_PRIMARY = "oklch(0.55 0.22 27)";

function renderWithColors(mode: ThemeMode, colors: ThemeColors) {
  const store = createInMemorySettingsStore({
    ...DEFAULT_SETTINGS,
    theme: { ...DEFAULT_SETTINGS.theme, mode, colors },
  } as Settings);

  return render(
    <SettingsProvider store={store}>
      <ThemeProvider>
        <div />
      </ThemeProvider>
    </SettingsProvider>,
  );
}

afterEach(() => {
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("style");
  // @ts-expect-error clean the stub so a later test re-stubs from scratch.
  delete window.matchMedia;
});

describe("ThemeProvider applies active mode colors (AC-007 / TC-010)", () => {
  it("should set the dark override on documentElement if the effective mode is dark", async () => {
    stubMatchMedia(true);

    renderWithColors("dark", {
      light: { tokens: {}, editor: {} },
      dark: { tokens: { primary: DARK_PRIMARY }, editor: {} },
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    await waitFor(() => {
      expect(
        document.documentElement.style.getPropertyValue("--primary").trim(),
      ).toBe(DARK_PRIMARY);
    });
  });

  it("should apply only the dark override and NOT a light-only override while the effective mode is dark", async () => {
    stubMatchMedia(true);

    renderWithColors("dark", {
      light: { tokens: { primary: LIGHT_PRIMARY }, editor: {} },
      dark: { tokens: { background: DARK_PRIMARY }, editor: {} },
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
    await waitFor(() => {
      expect(
        document.documentElement.style.getPropertyValue("--background").trim(),
      ).toBe(DARK_PRIMARY);
    });
    expect(
      document.documentElement.style.getPropertyValue("--primary").trim(),
    ).toBe("");
  });
});
