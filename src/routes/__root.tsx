import { CommandPalette, useActionHotkeys } from "@pziel/pureui";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { DeleteDeckDialog } from "@/components/workspace/delete-deck-dialog";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/components/workspace/workspace-context";
import { PaletteProvider, usePalette } from "@/lib/palette/palette-context";
import { SettingsProvider } from "@/lib/settings/settings-context";
import { createSettingsStore } from "@/lib/settings/store-factory";
import { useEffectiveShortcuts } from "@/lib/shortcuts/use-effective-shortcuts";
import { ThemeProvider } from "@/lib/theme/theme-context";

function ShellPalette() {
  const {
    decks,
    openDeck,
    openStudy,
    openSettings,
    createDeck,
    requestDeleteDeck,
  } = useWorkspace();
  const { isOpen: isPaletteOpen, setOpen: setIsPaletteOpen } = usePalette();

  useActionHotkeys(
    {
      "open-command-palette": () => setIsPaletteOpen(!isPaletteOpen),
    },
    useEffectiveShortcuts(),
    { preventDefault: true },
  );

  const deckCommands = decks.map((deck) => ({
    key: `open-deck-${deck.id}`,
    name: `Open deck: ${deck.name}`,
    run: () => openDeck(deck.id),
  }));

  return (
    <CommandPalette
      open={isPaletteOpen}
      onOpenChange={setIsPaletteOpen}
      commands={[
        { key: "new-deck", name: "New deck", run: () => createDeck() },
        { key: "open-settings", name: "Open Settings", run: openSettings },
        ...decks.map((deck) => ({
          key: `study-${deck.id}`,
          name: `Study: ${deck.name}`,
          run: () => openStudy(deck.id),
        })),
        ...deckCommands,
        ...decks.map((deck) => ({
          key: `delete-deck-${deck.id}`,
          name: `Delete deck: ${deck.name}`,
          run: () => requestDeleteDeck(deck.id),
        })),
      ]}
    />
  );
}

function RootLayout() {
  const [store] = useState(createSettingsStore);

  return (
    <SettingsProvider store={store}>
      <ThemeProvider>
        <PaletteProvider>
          <ToastProvider>
            <WorkspaceProvider>
              <div className="h-screen">
                <Outlet />
              </div>
              <ShellPalette />
              <DeleteDeckDialog />
            </WorkspaceProvider>
          </ToastProvider>
        </PaletteProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});
