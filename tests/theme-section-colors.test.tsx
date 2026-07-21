import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EditorView, runScopeHandlers } from "@codemirror/view";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type ThemeColors,
} from "@/lib/settings/settings";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { DEFAULT_THEME_COLORS } from "@/lib/theme/theme-defaults";
import { applyDefaults } from "@/lib/theme/overrides";
import { ThemeSection } from "@/components/settings/theme-section";

function stubMatchMedia(matches = false) {
  window.matchMedia = ((query: string) => {
    void query;
    return {
      matches,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    };
  }) as unknown as typeof window.matchMedia;
}

function liveDoc(): string {
  const el = document.querySelector<HTMLElement>(".cm-editor");
  if (!el) {
    throw new Error(".cm-editor not found");
  }
  const view = EditorView.findFromDOM(el);
  if (!view) {
    throw new Error("live EditorView not found");
  }
  return view.state.doc.toString();
}

async function setDoc(text: string) {
  const view = EditorView.findFromDOM(
    document.querySelector<HTMLElement>(".cm-editor")!,
  )!;
  await act(async () => {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  });
}

async function pressModS() {
  const view = EditorView.findFromDOM(
    document.querySelector<HTMLElement>(".cm-editor")!,
  )!;
  await act(async () => {
    runScopeHandlers(
      view,
      new KeyboardEvent("keydown", {
        key: "s",
        code: "KeyS",
        keyCode: 83,
        ctrlKey: true,
      }),
      "editor",
    );
  });
}

function renderSection(initial?: ThemeColors) {
  stubMatchMedia(false);
  const seeded: Settings = {
    ...DEFAULT_SETTINGS,
    theme: {
      ...DEFAULT_SETTINGS.theme,
      mode: "light",
      colors: initial ?? DEFAULT_SETTINGS.theme.colors,
    },
  };
  const inner = createInMemorySettingsStore(seeded);
  const saved: Settings[] = [];
  const store = {
    load: inner.load,
    save: (s: Settings) => {
      saved.push(s);
      return inner.save(s);
    },
  };
  render(
    <SettingsProvider store={store}>
      <ThemeProvider>
        <ThemeSection />
      </ThemeProvider>
    </SettingsProvider>,
  );
  return { saved };
}

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("style");
  // @ts-expect-error drop the stub between tests.
  delete window.matchMedia;
});

describe("ThemeSection mode toggle (AC-001)", () => {
  it("should still render the Light, Dark, and System mode buttons", async () => {
    renderSection();

    expect(
      await screen.findByRole("button", { name: /light/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /system/i })).toBeInTheDocument();
  });
});

describe("ThemeSection color editor (AC-009 / AC-010 / TC-012 / TC-013)", () => {
  it("should render a CodeMirror editor for syntax-highlighted JSON", async () => {
    renderSection();

    await waitFor(() => {
      expect(document.querySelector(".cm-editor")).not.toBeNull();
    });
  });

  it("should seed the editor with the full effective color set JSON", async () => {
    renderSection();

    await waitFor(() => {
      expect(document.querySelector(".cm-editor")).not.toBeNull();
    });

    const seeded = JSON.parse(liveDoc()) as ThemeColors;
    const full = applyDefaults(
      DEFAULT_SETTINGS.theme.colors,
      DEFAULT_THEME_COLORS,
    );
    expect(seeded).toEqual(full);
  });

  it("should persist exactly the sparse diff if a token is edited and Save is clicked", async () => {
    const { saved } = renderSection();

    await waitFor(() => {
      expect(document.querySelector(".cm-editor")).not.toBeNull();
    });

    const full = applyDefaults(
      DEFAULT_SETTINGS.theme.colors,
      DEFAULT_THEME_COLORS,
    );
    const edited: ThemeColors = {
      ...full,
      light: {
        ...full.light,
        tokens: { ...full.light.tokens, primary: "oklch(0.55 0.22 27)" },
      },
    };
    await setDoc(JSON.stringify(edited, null, 2));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(saved.length).toBeGreaterThan(0);
    });
    const persisted = saved.at(-1)!.theme.colors;
    expect(persisted.light.tokens.primary).toBe("oklch(0.55 0.22 27)");
    expect(persisted.light.tokens.background).toBeUndefined();
    expect(persisted.dark.tokens).toEqual({});
  });

  it("should persist the sparse diff if a token is edited and Cmd+S is pressed", async () => {
    const { saved } = renderSection();

    await waitFor(() => {
      expect(document.querySelector(".cm-editor")).not.toBeNull();
    });

    const full = applyDefaults(
      DEFAULT_SETTINGS.theme.colors,
      DEFAULT_THEME_COLORS,
    );
    const edited: ThemeColors = {
      ...full,
      light: {
        ...full.light,
        tokens: { ...full.light.tokens, primary: "oklch(0.55 0.22 27)" },
      },
    };
    await setDoc(JSON.stringify(edited, null, 2));
    await pressModS();

    await waitFor(() => {
      expect(saved.length).toBeGreaterThan(0);
    });
    const persisted = saved.at(-1)!.theme.colors;
    expect(persisted.light.tokens.primary).toBe("oklch(0.55 0.22 27)");
    expect(persisted.light.tokens.background).toBeUndefined();
  });

  it("should drop an override edited back to the default on Save", async () => {
    const { saved } = renderSection({
      light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
      dark: { tokens: {}, editor: {} },
    });

    await waitFor(() => {
      expect(document.querySelector(".cm-editor")).not.toBeNull();
    });

    const full = applyDefaults(
      {
        light: { tokens: { primary: "oklch(0.55 0.22 27)" }, editor: {} },
        dark: { tokens: {}, editor: {} },
      },
      DEFAULT_THEME_COLORS,
    );
    const resetToDefault: ThemeColors = {
      ...full,
      light: {
        ...full.light,
        tokens: {
          ...full.light.tokens,
          primary: DEFAULT_THEME_COLORS.light.tokens.primary,
        },
      },
    };
    await setDoc(JSON.stringify(resetToDefault, null, 2));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(saved.length).toBeGreaterThan(0);
    });
    expect(saved.at(-1)!.theme.colors.light.tokens.primary).toBeUndefined();
  });

  it("should disable Save if the editor holds invalid JSON", async () => {
    renderSection();

    await waitFor(() => {
      expect(document.querySelector(".cm-editor")).not.toBeNull();
    });

    await setDoc("{ not json");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    });
  });

  it("should disable Save if a token value is not a string", async () => {
    const { saved } = renderSection();

    await waitFor(() => {
      expect(document.querySelector(".cm-editor")).not.toBeNull();
    });

    await setDoc(
      JSON.stringify({
        light: { tokens: { primary: 42 }, editor: {} },
        dark: { tokens: {}, editor: {} },
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(saved).toHaveLength(0);
  });
});
