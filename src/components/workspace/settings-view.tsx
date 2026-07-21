import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeSection } from "@/components/settings/theme-section";
import { ShortcutsSection } from "@/components/settings/shortcuts-section";
import { StorageSection } from "@/components/settings/storage-section";

type Section = "theme" | "shortcuts" | "storage";

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
        {section === "shortcuts" && <ShortcutsSection />}
        {section === "storage" && <StorageSection />}
      </div>
    </div>
  );
}
