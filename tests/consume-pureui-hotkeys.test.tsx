import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { useActionHotkeys } from "@pziel/pureui";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ShortcutActionId } from "@/lib/shortcuts/registry";
import { useEffectiveShortcuts } from "@/lib/shortcuts/use-effective-shortcuts";

// R15 Task 5. puredeck CONSUMES the hoisted useActionHotkeys hook from
// @pziel/pureui and deletes its local copy. Two things are proven here:
// TC-011 - puredeck's provider-tolerant settings read still fires the handler
//   with NO SettingsProvider mounted (falls back to DEFAULT_SETTINGS, never
//   throws) - the read stays app-side in useEffectiveShortcuts().
// TC-012 - a STATIC guard (reads the source tree off disk, NOT shell grep - some
//   files carry stray non-text bytes plain grep skips as "binary") that the local
//   hook is deleted, no src file imports it, every call site resolves the hook
//   from @pziel/pureui, and registry.ts + resolve.ts stay app-side.

const testDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(testDir, "../src");

const DELETED_MODULE_FILE = "lib/shortcuts/use-action-hotkeys.ts";
const FORBIDDEN_SPECIFIER = "@/lib/shortcuts/use-action-hotkeys";
const CALL_SITES = [
  "components/workspace/study-view.tsx",
  "components/workspace/main.tsx",
  "components/workspace/workspace-layout.tsx",
  "routes/__root.tsx",
];
const APP_KEPT_FILES = [
  "lib/shortcuts/registry.ts",
  "lib/shortcuts/resolve.ts",
];

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

function importedSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null = pattern.exec(source);
    while (match !== null) {
      specifiers.push(match[1]);
      match = pattern.exec(source);
    }
  }
  return specifiers;
}

function pureuiImportBlock(source: string): string {
  return (
    source.match(/import\s*\{[^}]*\}\s*from\s*["']@pziel\/pureui["']/s)?.[0] ??
    ""
  );
}

function Harness({
  handlers,
}: {
  handlers: Partial<Record<ShortcutActionId, () => void>>;
}) {
  useActionHotkeys(handlers, useEffectiveShortcuts(), { preventDefault: true });
  return <span data-testid="ready">ready</span>;
}

afterEach(() => {
  cleanup();
});

describe("puredeck consumes the pureui useActionHotkeys hook (TC-011)", () => {
  // TC-011 - behavior: with NO SettingsProvider, the provider-tolerant seam
  // falls back to DEFAULT_SETTINGS and the default-bound key still fires.
  it("should fire the default-bound handler with no SettingsProvider mounted", async () => {
    const flip = vi.fn();

    render(
      <HotkeysProvider>
        <Harness handlers={{ "flip-card": flip }} />
      </HotkeysProvider>,
    );
    await screen.findByTestId("ready");
    await act(async () => {});

    // flip-card's registry default is Space.
    fireEvent.keyDown(document, { key: " ", code: "Space" });

    expect(flip).toHaveBeenCalledTimes(1);
  });
});

describe("puredeck consumes the pureui useActionHotkeys hook (TC-012)", () => {
  // TC-012(a) - behavior: the local hook module is deleted from disk.
  it("should not ship src/lib/shortcuts/use-action-hotkeys.ts", () => {
    expect(existsSync(resolve(srcDir, DELETED_MODULE_FILE))).toBe(false);
  });

  // TC-012(b) - behavior: no src file imports the deleted local module.
  it("should have no src file importing @/lib/shortcuts/use-action-hotkeys", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(srcDir)) {
      const specifiers = importedSpecifiers(readFileSync(file, "utf8"));
      if (specifiers.includes(FORBIDDEN_SPECIFIER)) {
        offenders.push(relative(srcDir, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  // TC-012(c) - behavior: every call site resolves useActionHotkeys from @pziel/pureui.
  it("should import useActionHotkeys from @pziel/pureui at every call site", () => {
    const missing = CALL_SITES.filter(
      (rel) =>
        !pureuiImportBlock(readFileSync(resolve(srcDir, rel), "utf8")).includes(
          "useActionHotkeys",
        ),
    );

    expect(missing).toEqual([]);
  });

  // TC-012(d) - behavior: the app-side registry + resolve wrappers stay local.
  it("should keep registry.ts and resolve.ts app-side", () => {
    const present = APP_KEPT_FILES.filter((rel) =>
      existsSync(resolve(srcDir, rel)),
    );

    expect(present).toEqual(APP_KEPT_FILES);
  });
});
