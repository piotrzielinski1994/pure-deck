import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";
import { type SettingsStore } from "@/lib/settings/settings";
import { ThemeProvider } from "@/lib/theme/theme-context";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/workspace/workspace-context";
import { WorkspaceLayout } from "@/components/workspace/workspace-layout";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";

function renderShell(store: SettingsStore = createInMemorySettingsStore()) {
  return render(
    <AppProviders>
      <SettingsProvider store={store}>
        <ThemeProvider>
          <WorkspaceProvider decks={DEMO_DECKS}>
            <WorkspaceLayout />
          </WorkspaceProvider>
        </ThemeProvider>
      </SettingsProvider>
    </AppProviders>,
  );
}

afterEach(() => {
  cleanup();
});

describe("workspace shell sidebar (TC-001 / AC-001 / AC-003)", () => {
  it("should render the puredeck brand and a row per demo deck", async () => {
    renderShell();

    expect(await screen.findByText("puredeck")).toBeInTheDocument();
    expect(screen.getByText("Spanish")).toBeInTheDocument();
    expect(screen.getByText("Capitals")).toBeInTheDocument();
    expect(screen.getByText("Verbs")).toBeInTheDocument();
  });

  it("should render a resize handle between the sidebar and main", async () => {
    renderShell();

    await screen.findByText("puredeck");

    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

describe("workspace shell tabs (TC-004 / AC-004)", () => {
  it("should open a deck as a tab if its sidebar row is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await screen.findByText("puredeck");
    expect(
      screen.queryByRole("tab", { name: /Spanish/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByText("Spanish"));

    expect(
      await screen.findByRole("tab", { name: /Spanish/ }),
    ).toBeInTheDocument();
  });

  it("should switch the active tab if another tab is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await screen.findByText("puredeck");
    await user.click(screen.getByText("Spanish"));
    await user.click(screen.getByText("Capitals"));

    const spanishTab = await screen.findByRole("tab", { name: /Spanish/ });
    const capitalsTab = await screen.findByRole("tab", { name: /Capitals/ });

    expect(capitalsTab).toHaveAttribute("aria-selected", "true");
    expect(spanishTab).toHaveAttribute("aria-selected", "false");

    await user.click(spanishTab);

    expect(spanishTab).toHaveAttribute("aria-selected", "true");
    expect(capitalsTab).toHaveAttribute("aria-selected", "false");
  });

  it("should close a tab if its close control is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await screen.findByText("puredeck");
    await user.click(screen.getByText("Spanish"));
    await user.click(screen.getByText("Capitals"));

    const spanishTab = await screen.findByRole("tab", { name: /Spanish/ });
    await user.click(within(spanishTab).getByRole("button"));

    await waitFor(() => {
      expect(
        screen.queryByRole("tab", { name: /Spanish/ }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /Capitals/ })).toBeInTheDocument();
  });

  it("should activate the neighbour tab if the active tab is closed (E-3)", async () => {
    const user = userEvent.setup();
    renderShell();

    await screen.findByText("puredeck");
    await user.click(screen.getByText("Spanish"));
    await user.click(screen.getByText("Capitals"));

    const capitalsTab = await screen.findByRole("tab", { name: /Capitals/ });
    expect(capitalsTab).toHaveAttribute("aria-selected", "true");

    await user.click(within(capitalsTab).getByRole("button"));

    await waitFor(() => {
      expect(
        screen.queryByRole("tab", { name: /Capitals/ }),
      ).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("tab", { name: /Spanish/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

function ReorderProbe() {
  const { reorderTabs, openTabIds } = useWorkspace();
  return (
    <button
      type="button"
      onClick={() => reorderTabs([...openTabIds].reverse())}
    >
      reverse tabs
    </button>
  );
}

describe("workspace shell tab reorder (AC-004)", () => {
  it("should reflect a new tab order if the open tabs are reordered", async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <SettingsProvider store={createInMemorySettingsStore()}>
          <ThemeProvider>
            <WorkspaceProvider decks={DEMO_DECKS}>
              <WorkspaceLayout />
              <ReorderProbe />
            </WorkspaceProvider>
          </ThemeProvider>
        </SettingsProvider>
      </AppProviders>,
    );

    await screen.findByText("puredeck");
    await user.click(screen.getByText("Spanish"));
    await user.click(screen.getByText("Capitals"));

    const before = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(before[0]).toMatch(/Spanish/);
    expect(before[1]).toMatch(/Capitals/);

    await user.click(screen.getByText("reverse tabs"));

    await waitFor(() => {
      const after = screen.getAllByRole("tab").map((tab) => tab.textContent);
      expect(after[0]).toMatch(/Capitals/);
      expect(after[1]).toMatch(/Spanish/);
    });
  });
});

describe("workspace shell stale active tab (E-8)", () => {
  it("should activate the first open tab if the persisted active tab is stale", async () => {
    const store = createInMemorySettingsStore({
      version: 1,
      layouts: {},
      sidebarCollapsed: false,
      openTabIds: ["spanish", "capitals"],
      activeTabId: "gone",
      theme: { mode: "system", colors: { light: { tokens: {}, editor: {} }, dark: { tokens: {}, editor: {} } } },
      shortcuts: {},
    });
    renderShell(store);

    const spanishTab = await screen.findByRole("tab", { name: /Spanish/ });
    expect(spanishTab).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("No deck open")).not.toBeInTheDocument();
  });
});

describe("workspace shell empty state (TC-010 / AC-010)", () => {
  it("should show the No deck open empty state if no tabs are open", async () => {
    const user = userEvent.setup();
    renderShell();

    expect(await screen.findByText("No deck open")).toBeInTheDocument();

    await user.click(screen.getByText("Spanish"));

    await waitFor(() => {
      expect(screen.queryByText("No deck open")).not.toBeInTheDocument();
    });

    const spanishTab = await screen.findByRole("tab", { name: /Spanish/ });
    await user.click(within(spanishTab).getByRole("button"));

    expect(await screen.findByText("No deck open")).toBeInTheDocument();
  });
});

describe("workspace shell collapse (TC-003 / AC-002)", () => {
  it("should hide the sidebar if collapse is toggled and restore it if toggled again", async () => {
    renderShell();

    expect(await screen.findByText("puredeck")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "b", code: "KeyB", ctrlKey: true });

    await waitFor(() => {
      expect(screen.queryByText("puredeck")).not.toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "b", code: "KeyB", ctrlKey: true });

    expect(await screen.findByText("puredeck")).toBeInTheDocument();
  });
});
