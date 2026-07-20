import { describe, it, expect } from "vitest";

import { installContextMenuSuppressor } from "@/app/suppress-native-context-menu";

describe("installContextMenuSuppressor", () => {
  it("should prevent the default on a contextmenu event", () => {
    const cleanup = installContextMenuSuppressor(document);
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });

    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    cleanup();
  });

  it("should stop suppressing once cleaned up", () => {
    const cleanup = installContextMenuSuppressor(document);
    cleanup();
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });

    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("should not stop propagation to other contextmenu listeners", () => {
    const cleanup = installContextMenuSuppressor(document);
    let sawEvent = false;
    const spy = () => {
      sawEvent = true;
    };
    document.body.addEventListener("contextmenu", spy);

    document.body.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
    );

    expect(sawEvent).toBe(true);
    document.body.removeEventListener("contextmenu", spy);
    cleanup();
  });
});
