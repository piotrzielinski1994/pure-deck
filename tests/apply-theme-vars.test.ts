import { describe, expect, it } from "vitest";
import { applyThemeVars } from "@/lib/theme/apply-vars";
import type { ThemeColorOverrides } from "@/lib/settings/settings";

const tokens = (
  partial: ThemeColorOverrides["tokens"],
): ThemeColorOverrides => ({ tokens: partial, editor: {} });

describe("applyThemeVars (AC-006 / TC-007)", () => {
  it("should set --primary inline if primary is overridden", () => {
    const el = document.createElement("div");

    applyThemeVars(el, "light", tokens({ primary: "oklch(0.55 0.22 27)" }));

    expect(el.style.getPropertyValue("--primary").trim()).toBe(
      "oklch(0.55 0.22 27)",
    );
  });
});

describe("applyThemeVars hyphen token (AC-006 / TC-009)", () => {
  it("should set --card-foreground inline for the card-foreground token", () => {
    const el = document.createElement("div");

    applyThemeVars(
      el,
      "light",
      tokens({ "card-foreground": "oklch(0.2 0 0)" }),
    );

    expect(el.style.getPropertyValue("--card-foreground").trim()).toBe(
      "oklch(0.2 0 0)",
    );
  });
});

describe("applyThemeVars clears stale vars (AC-006 / TC-008)", () => {
  it("should clear a previously-set --primary if the next call omits it", () => {
    const el = document.createElement("div");

    applyThemeVars(el, "light", tokens({ primary: "oklch(0.55 0.22 27)" }));
    expect(el.style.getPropertyValue("--primary").trim()).toBe(
      "oklch(0.55 0.22 27)",
    );

    applyThemeVars(el, "dark", tokens({}));

    expect(el.style.getPropertyValue("--primary").trim()).toBe("");
  });

  it("should not set an inline var for a token that is not overridden", () => {
    const el = document.createElement("div");

    applyThemeVars(el, "light", tokens({ primary: "oklch(0.55 0.22 27)" }));

    expect(el.style.getPropertyValue("--background").trim()).toBe("");
    expect(el.style.getPropertyValue("--foreground").trim()).toBe("");
  });

  it("should swap which var is set if the overridden token changes", () => {
    const el = document.createElement("div");

    applyThemeVars(el, "light", tokens({ primary: "oklch(0.55 0.22 27)" }));
    applyThemeVars(el, "light", tokens({ background: "oklch(0.99 0 0)" }));

    expect(el.style.getPropertyValue("--background").trim()).toBe(
      "oklch(0.99 0 0)",
    );
    expect(el.style.getPropertyValue("--primary").trim()).toBe("");
  });
});
