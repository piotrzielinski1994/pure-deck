import { useActionHotkeys } from "@pziel/pureui";
import { ContentTabs } from "@/components/workspace/content-tabs";
import { DeckView } from "@/components/workspace/deck-view";
import { SettingsView } from "@/components/workspace/settings-view";
import { StudyView } from "@/components/workspace/study-view";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useSettings } from "@/lib/settings/settings-context";
import { useEffectiveShortcuts } from "@/lib/shortcuts/use-effective-shortcuts";

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <p className="text-base font-medium text-foreground">No deck open</p>
      <p>Pick a deck on the left, or create one to begin.</p>
    </div>
  );
}

function ActiveSurface() {
  const {
    tabs,
    activeTabId,
    deckById,
    openStudy,
    saveDeck,
    reviews,
    gradeCard,
  } = useWorkspace();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  if (!activeTab) {
    return <EmptyState />;
  }
  if (activeTab.kind === "settings") {
    return <SettingsView />;
  }
  const deck = activeTab.deckId ? deckById(activeTab.deckId) : undefined;
  if (!deck) {
    return <EmptyState />;
  }
  if (activeTab.kind === "study") {
    return (
      <StudyView
        key={deck.id}
        deck={deck}
        reviews={reviews}
        onGrade={gradeCard}
      />
    );
  }
  return (
    <DeckView
      deck={deck}
      onStudy={() => openStudy(deck.id)}
      onSaveDeck={saveDeck}
    />
  );
}

export function Main() {
  const { settings, saveSidebarCollapsed } = useSettings();
  const { tabs, activeTabId, deckById, saveDeck } = useWorkspace();

  const saveActiveDeck = (): void => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
    if (activeTab?.kind !== "deck" || !activeTab.deckId) {
      return;
    }
    const deck = deckById(activeTab.deckId);
    if (!deck) {
      return;
    }
    const focused = document.activeElement;
    if (focused instanceof HTMLInputElement) {
      focused.blur();
      return;
    }
    saveDeck(deck);
  };

  useActionHotkeys(
    {
      "toggle-sidebar": () => saveSidebarCollapsed(!settings.sidebarCollapsed),
      "save-active-deck": saveActiveDeck,
    },
    useEffectiveShortcuts(),
    { preventDefault: true },
  );

  return (
    <div className="flex h-full flex-col">
      <ContentTabs />
      <div className="min-h-0 flex-1">
        <ActiveSurface />
      </div>
    </div>
  );
}
