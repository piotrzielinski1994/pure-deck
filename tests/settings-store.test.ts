import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type Settings,
} from "@/lib/settings/settings";
import { createInMemorySettingsStore } from "@/lib/settings/in-memory-store";

describe("in-memory settings store (AC-009 / TC-002 / TC-003)", () => {
  it("should return the saved Settings if load is called after save", async () => {
    const saved: Settings = {
      ...DEFAULT_SETTINGS,
      layouts: { workspace: { sidebar: 32, main: 68 } },
      sidebarCollapsed: true,
    };
    const store = createInMemorySettingsStore();

    await store.save(saved);
    const loaded = await store.load();

    expect(loaded).toEqual(saved);
    expect(loaded.layouts.workspace).toEqual({ sidebar: 32, main: 68 });
    expect(loaded.sidebarCollapsed).toBe(true);
  });
});

describe("DEFAULT_SETTINGS (AC-009)", () => {
  it("should expose sane defaults if nothing has been persisted", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      version: 1,
      layouts: {},
      sidebarCollapsed: false,
      openTabIds: [],
      activeTabId: null,
      theme: { mode: "system", colors: { light: { tokens: {}, editor: {} }, dark: { tokens: {}, editor: {} } } },
      shortcuts: {},
    });
  });
});

describe("mergeSettings (AC-009 / E-1 / TC-012)", () => {
  it("should fill missing fields from defaults if given a partial object", () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { sidebarCollapsed: true });

    expect(merged.sidebarCollapsed).toBe(true);
    expect(merged.version).toBe(1);
    expect(merged.layouts).toEqual({});
    expect(merged.openTabIds).toEqual([]);
    expect(merged.activeTabId).toBeNull();
    expect(merged.theme).toEqual({
      mode: "system",
      colors: { light: { tokens: {}, editor: {} }, dark: { tokens: {}, editor: {} } },
    });
  });

  it("should coerce a garbage or malformed blob to valid defaults without throwing", () => {
    const garbageBlobs: unknown[] = [
      null,
      undefined,
      "not-an-object",
      42,
      [],
      { theme: 42, openTabIds: "nope", activeTabId: {}, version: "x" },
    ];

    garbageBlobs.forEach((blob) => {
      expect(() => mergeSettings(DEFAULT_SETTINGS, blob)).not.toThrow();
      expect(mergeSettings(DEFAULT_SETTINGS, blob)).toEqual(DEFAULT_SETTINGS);
    });
  });

  it("should preserve valid persisted values if the blob is well-formed", () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      theme: { mode: "dark" },
      activeTabId: "deck-1",
      openTabIds: ["deck-1"],
    });

    expect(merged.theme).toEqual({
      mode: "dark",
      colors: { light: { tokens: {}, editor: {} }, dark: { tokens: {}, editor: {} } },
    });
    expect(merged.activeTabId).toBe("deck-1");
    expect(merged.openTabIds).toEqual(["deck-1"]);
    expect(merged.version).toBe(1);
    expect(merged.layouts).toEqual({});
    expect(merged.sidebarCollapsed).toBe(false);
  });
});
