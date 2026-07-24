import { ShortcutsSection } from "@pziel/pureui";
import { formatForDisplay } from "@tanstack/hotkeys";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from "@/lib/settings/settings";
import { SettingsProvider, useSettings } from "@/lib/settings/settings-context";
import {
  SHORTCUT_ACTIONS,
  type ShortcutOverrides,
} from "@/lib/shortcuts/registry";
import { findConflict, resolveShortcuts } from "@/lib/shortcuts/resolve";

// Wire the hoisted pureui ShortcutsSection with puredeck's real registry, resolve
// and settings mutators - the same wiring as the SettingsView render site, so
// this stays a consume-integration proof over the real action catalog.
function WiredShortcutsSection() {
  const {
    settings,
    addShortcut,
    removeShortcut,
    replaceShortcut,
    resetShortcut,
  } = useSettings();

  return (
    <ShortcutsSection
      actions={SHORTCUT_ACTIONS}
      effective={resolveShortcuts(settings.shortcuts)}
      overrides={settings.shortcuts}
      store={{
        add: addShortcut,
        remove: removeShortcut,
        replace: replaceShortcut,
        reset: resetShortcut,
      }}
      findConflict={findConflict}
      help="Press Add and type a combination to bind it; an action can have several."
    />
  );
}

function renderSection(overrides: ShortcutOverrides = {}) {
  const seeded: Settings = { ...DEFAULT_SETTINGS, shortcuts: overrides };
  const inner = createInMemorySettingsStore(seeded);
  const saveSpy = vi.fn(inner.save);
  const store: SettingsStore = { load: inner.load, save: saveSpy };

  const result = render(
    <HotkeysProvider>
      <SettingsProvider store={store}>
        <WiredShortcutsSection />
      </SettingsProvider>
    </HotkeysProvider>,
  );

  return { ...result, saveSpy };
}

function actionById(id: string): (typeof SHORTCUT_ACTIONS)[number] {
  const action = SHORTCUT_ACTIONS.find((a) => a.id === id);
  if (!action) {
    throw new Error(`shortcut action not found: ${id}`);
  }
  return action;
}

const SIDEBAR = actionById("toggle-sidebar");
const PALETTE = actionById("open-command-palette");

afterEach(() => {
  cleanup();
});

describe("ShortcutsSection (AC-004 / TC-009)", () => {
  it("should render a row for every registry action", async () => {
    renderSection();

    for (const action of SHORTCUT_ACTIONS) {
      expect(await screen.findByText(action.name)).toBeInTheDocument();
    }
  });

  it("should show each action's default binding formatted for display", async () => {
    renderSection();

    expect(
      await screen.findByText(formatForDisplay(SIDEBAR.defaultHotkey)),
    ).toBeInTheDocument();
  });

  it("should show an Add button for every action", async () => {
    renderSection();

    for (const action of SHORTCUT_ACTIONS) {
      expect(
        await screen.findByRole("button", {
          name: new RegExp(`add shortcut for ${action.name}`, "i"),
        }),
      ).toBeInTheDocument();
    }
  });

  it("should render a chip for every binding if an action has several", async () => {
    renderSection({ "toggle-sidebar": ["Mod+B", "Mod+Y"] });

    expect(
      await screen.findByText(formatForDisplay("Mod+B")),
    ).toBeInTheDocument();
    expect(screen.getByText(formatForDisplay("Mod+Y"))).toBeInTheDocument();
  });
});

describe("ShortcutsSection add (AC-004 / TC-010)", () => {
  it("should persist an appended binding if a new free combo is recorded", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);

    await user.keyboard("{Control>}y{/Control}");

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls[saveSpy.mock.calls.length - 1][0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual(["Mod+B", "Mod+Y"]);
  });

  it("should show the appended binding as a chip after recording", async () => {
    const user = userEvent.setup();
    renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);
    await user.keyboard("{Control>}y{/Control}");

    expect(
      await screen.findByText(formatForDisplay("Mod+Y")),
    ).toBeInTheDocument();
  });

  it("should turn the Add button into Cancel while recording", async () => {
    const user = userEvent.setup();
    renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);

    expect(
      await screen.findByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Press keys…")).toBeInTheDocument();
  });
});

describe("ShortcutsSection remove/disable (AC-004 / TC-011 / TC-012)", () => {
  it("should persist the removal of one binding if its × is clicked", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+B", "Mod+Y"] });

    const removeButton = await screen.findByRole("button", {
      name: `Remove ${formatForDisplay("Mod+Y")} from ${SIDEBAR.name}`,
    });
    await user.click(removeButton);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls[saveSpy.mock.calls.length - 1][0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual(["Mod+B"]);
  });

  it("should show a disabled state if the last binding is removed", async () => {
    const user = userEvent.setup();
    renderSection({ "toggle-sidebar": ["Mod+B"] });

    const removeButton = await screen.findByRole("button", {
      name: `Remove ${formatForDisplay("Mod+B")} from ${SIDEBAR.name}`,
    });
    await user.click(removeButton);

    expect(await screen.findByText("(disabled)")).toBeInTheDocument();
  });

  it("should persist an empty list if the last binding is removed", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+B"] });

    const removeButton = await screen.findByRole("button", {
      name: `Remove ${formatForDisplay("Mod+B")} from ${SIDEBAR.name}`,
    });
    await user.click(removeButton);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls[saveSpy.mock.calls.length - 1][0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual([]);
  });
});

describe("ShortcutsSection reset (AC-004 / TC-013)", () => {
  it("should not show a Reset button if the action has no override", async () => {
    renderSection();

    await screen.findByText(SIDEBAR.name);

    expect(
      screen.queryByRole("button", {
        name: new RegExp(`reset ${SIDEBAR.name}`, "i"),
      }),
    ).not.toBeInTheDocument();
  });

  it("should show a Reset button if the action has an override", async () => {
    renderSection({ "toggle-sidebar": ["Mod+Y"] });

    expect(
      await screen.findByRole("button", {
        name: new RegExp(`reset ${SIDEBAR.name}`, "i"),
      }),
    ).toBeInTheDocument();
  });

  it("should remove the override and restore the default if reset is clicked", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+Y"] });

    const resetButton = await screen.findByRole("button", {
      name: new RegExp(`reset ${SIDEBAR.name}`, "i"),
    });
    await user.click(resetButton);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls[saveSpy.mock.calls.length - 1][0];
    expect(persisted.shortcuts).not.toHaveProperty("toggle-sidebar");

    expect(
      await screen.findByText(formatForDisplay(SIDEBAR.defaultHotkey)),
    ).toBeInTheDocument();
  });
});

describe("ShortcutsSection conflict (AC-005 / TC-014)", () => {
  it("should name the owning action and not persist if a used combo is recorded", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);

    await user.keyboard("{Control>}k{/Control}");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      `${PALETTE.name} already uses that shortcut`,
    );
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("should keep the existing binding chip if a conflicting combo is recorded", async () => {
    const user = userEvent.setup();
    renderSection();

    const addButton = await screen.findByRole("button", {
      name: new RegExp(`add shortcut for ${SIDEBAR.name}`, "i"),
    });
    await user.click(addButton);
    await user.keyboard("{Control>}k{/Control}");

    expect(
      await screen.findByText(formatForDisplay(SIDEBAR.defaultHotkey)),
    ).toBeInTheDocument();
  });
});

describe("ShortcutsSection edit/replace (AC-004 / AC-006 / TC-015)", () => {
  it("should turn a binding chip into a recorder if the chip is clicked", async () => {
    const user = userEvent.setup();
    renderSection({ "toggle-sidebar": ["Mod+B"] });

    const chip = await screen.findByRole("button", {
      name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
    });
    await user.click(chip);

    expect(await screen.findByText("Press keys…")).toBeInTheDocument();
    expect(
      screen.queryByText(formatForDisplay("Mod+B")),
    ).not.toBeInTheDocument();
  });

  it("should replace the clicked binding in place if a free combo is recorded", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+B", "Mod+G"] });

    const chip = await screen.findByRole("button", {
      name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
    });
    await user.click(chip);

    await user.keyboard("{Control>}y{/Control}");

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const persisted = saveSpy.mock.calls[saveSpy.mock.calls.length - 1][0];
    expect(persisted.shortcuts["toggle-sidebar"]).toEqual(["Mod+Y", "Mod+G"]);
  });

  it("should keep the clicked binding and alert if an edit conflicts", async () => {
    const user = userEvent.setup();
    const { saveSpy } = renderSection({ "toggle-sidebar": ["Mod+B"] });

    const chip = await screen.findByRole("button", {
      name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
    });
    await user.click(chip);

    await user.keyboard("{Control>}k{/Control}");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(new RegExp(PALETTE.name, "i"));
    expect(saveSpy).not.toHaveBeenCalled();
    expect(screen.getByText(formatForDisplay("Mod+B"))).toBeInTheDocument();
  });

  it("should restore the binding chip if the edit recorder is cancelled", async () => {
    const user = userEvent.setup();
    renderSection({ "toggle-sidebar": ["Mod+B"] });

    const chip = await screen.findByRole("button", {
      name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
    });
    await user.click(chip);
    await screen.findByText("Press keys…");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(
      await screen.findByRole("button", {
        name: `Edit ${formatForDisplay("Mod+B")} for ${SIDEBAR.name}`,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Press keys…")).not.toBeInTheDocument();
  });
});
