import type { AppTokenName, ThemeColorOverrides } from "@/lib/settings/settings";
import { APP_TOKENS } from "@/lib/theme/theme-defaults";

function cssVarName(token: AppTokenName): string {
  return `--${token}`;
}

export function applyThemeVars(
  el: HTMLElement,
  _mode: "light" | "dark",
  colors: ThemeColorOverrides,
): void {
  APP_TOKENS.forEach((token) => {
    const value = colors.tokens[token];
    if (value === undefined) {
      el.style.removeProperty(cssVarName(token));
      return;
    }
    el.style.setProperty(cssVarName(token), value);
  });
}
