import { cn, ShortcutsSection } from "@pziel/pureui";
import { useState } from "react";
import { StorageSection } from "@/components/settings/storage-section";
import { ThemeSection } from "@/components/settings/theme-section";
import { useSettings } from "@/lib/settings/settings-context";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/registry";
import { findConflict, resolveShortcuts } from "@/lib/shortcuts/resolve";

type Section = "theme" | "shortcuts" | "storage";

function ShortcutSettings() {
  const {
    settings,
    addShortcut,
    removeShortcut,
    replaceShortcut,
    resetShortcut,
  } = useSettings();

  return (
    <ShortcutsSection
      className="p-6"
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
      help={
        <>
          Press Add and type a combination to bind it; an action can have
          several. Remove the × on a binding to drop it (removing the last one
          disables the action). Escape cancels recording, so it cannot be
          assigned.
        </>
      }
    />
  );
}

function SubTab({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        "flex items-center border-r px-3.5 text-sm text-muted-foreground hover:bg-accent",
        isActive &&
          "bg-accent text-foreground shadow-[inset_0_-1px_0_0_var(--primary)]",
      )}
    >
      {children}
    </button>
  );
}

export function SettingsView() {
  const [section, setSection] = useState<Section>("theme");

  return (
    <div className="flex h-full flex-col">
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex h-10 shrink-0 items-stretch border-b bg-muted/30"
      >
        <SubTab
          isActive={section === "theme"}
          onClick={() => setSection("theme")}
        >
          Theme
        </SubTab>
        <SubTab
          isActive={section === "shortcuts"}
          onClick={() => setSection("shortcuts")}
        >
          Shortcuts
        </SubTab>
        <SubTab
          isActive={section === "storage"}
          onClick={() => setSection("storage")}
        >
          Storage
        </SubTab>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {section === "theme" && <ThemeSection />}
        {section === "shortcuts" && <ShortcutSettings />}
        {section === "storage" && <StorageSection />}
      </div>
    </div>
  );
}
