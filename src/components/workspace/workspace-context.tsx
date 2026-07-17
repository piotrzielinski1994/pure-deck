import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useSettings } from "@/lib/settings/settings-context";
import {
  SETTINGS_TAB_ID,
  isStudyTabId,
  studyDeckId,
  studyTabId,
  type Deck,
} from "@/lib/workspace/model";
import { DEMO_DECKS } from "@/lib/workspace/demo-data";

export type TabKind = "deck" | "study" | "settings";

export type Tab = {
  id: string;
  kind: TabKind;
  label: string;
  deckId: string | null;
};

type WorkspaceContextValue = {
  decks: Deck[];
  selectedDeckId: string | null;
  openTabIds: string[];
  activeTabId: string | null;
  tabs: Tab[];
  deckById: (id: string) => Deck | undefined;
  openDeck: (id: string) => void;
  openStudy: (deckId: string) => void;
  openSettings: () => void;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  reorderTabs: (ids: string[]) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function neighbourAfterClose(
  openTabIds: string[],
  closedId: string,
): string | null {
  const index = openTabIds.indexOf(closedId);
  const remaining = openTabIds.filter((id) => id !== closedId);
  if (remaining.length === 0) {
    return null;
  }
  return remaining[Math.min(index, remaining.length - 1)];
}

export function WorkspaceProvider({
  children,
  decks = DEMO_DECKS,
}: {
  children: ReactNode;
  decks?: Deck[];
}) {
  const { settings, saveOpenTabs } = useSettings();
  const { openTabIds } = settings;
  const activeTabId =
    settings.activeTabId !== null && openTabIds.includes(settings.activeTabId)
      ? settings.activeTabId
      : (openTabIds[0] ?? null);

  const deckById = useCallback(
    (id: string) => decks.find((deck) => deck.id === id),
    [decks],
  );

  const tabLabel = useCallback(
    (tabId: string): { kind: TabKind; label: string; deckId: string | null } => {
      if (tabId === SETTINGS_TAB_ID) {
        return { kind: "settings", label: "Settings", deckId: null };
      }
      if (isStudyTabId(tabId)) {
        const deckId = studyDeckId(tabId);
        return {
          kind: "study",
          label: `Study: ${deckById(deckId)?.name ?? "deck"}`,
          deckId,
        };
      }
      return { kind: "deck", label: deckById(tabId)?.name ?? tabId, deckId: tabId };
    },
    [deckById],
  );

  const tabs = useMemo<Tab[]>(
    () => openTabIds.map((id) => ({ id, ...tabLabel(id) })),
    [openTabIds, tabLabel],
  );

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const selectedDeckId = activeTab?.deckId ?? null;

  const openTab = useCallback(
    (id: string) => {
      const nextOpen = openTabIds.includes(id)
        ? openTabIds
        : [...openTabIds, id];
      saveOpenTabs(nextOpen, id);
    },
    [openTabIds, saveOpenTabs],
  );

  const openDeck = useCallback((id: string) => openTab(id), [openTab]);
  const openStudy = useCallback(
    (deckId: string) => openTab(studyTabId(deckId)),
    [openTab],
  );
  const openSettings = useCallback(
    () => openTab(SETTINGS_TAB_ID),
    [openTab],
  );

  const setActiveTab = useCallback(
    (id: string) => saveOpenTabs(openTabIds, id),
    [openTabIds, saveOpenTabs],
  );

  const closeTab = useCallback(
    (id: string) => {
      const nextOpen = openTabIds.filter((tabId) => tabId !== id);
      const nextActive =
        activeTabId === id
          ? neighbourAfterClose(openTabIds, id)
          : activeTabId;
      saveOpenTabs(nextOpen, nextActive);
    },
    [openTabIds, activeTabId, saveOpenTabs],
  );

  const reorderTabs = useCallback(
    (ids: string[]) => saveOpenTabs(ids, activeTabId),
    [activeTabId, saveOpenTabs],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      decks,
      selectedDeckId,
      openTabIds,
      activeTabId,
      tabs,
      deckById,
      openDeck,
      openStudy,
      openSettings,
      setActiveTab,
      closeTab,
      reorderTabs,
    }),
    [
      decks,
      selectedDeckId,
      openTabIds,
      activeTabId,
      tabs,
      deckById,
      openDeck,
      openStudy,
      openSettings,
      setActiveTab,
      closeTab,
      reorderTabs,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return value;
}
