import { json, jsonParseLinter } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter, type Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";
import type { EditorTokenName } from "@/lib/settings/settings";

export type EditorColors = Record<EditorTokenName, string>;

export function makeChrome(colors: EditorColors, isDark: boolean): Extension {
  return EditorView.theme(
    {
      "&": {
        backgroundColor: "transparent",
        height: "100%",
      },
      ".cm-content": { caretColor: colors.caret },
      "&.cm-focused": { outline: "none" },
      "&.cm-focused .cm-cursor": { borderLeftColor: colors.caret },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: colors.selection },
      ".cm-activeLine": { backgroundColor: "transparent" },
      ".cm-activeLineGutter": { backgroundColor: "transparent" },
      ".cm-gutters": {
        backgroundColor: "transparent",
        color: colors.gutter,
        border: "none",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-mono, ui-monospace, monospace)",
      },
    },
    { dark: isDark },
  );
}

export function makeHighlight(colors: EditorColors): Extension {
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: [t.keyword, t.bool, t.null], color: colors.keyword },
      { tag: [t.string, t.special(t.string)], color: colors.string },
      { tag: [t.number], color: colors.number },
      {
        tag: [t.propertyName, t.definition(t.propertyName)],
        color: colors.property,
      },
      { tag: [t.comment], color: colors.comment, fontStyle: "italic" },
      { tag: [t.invalid], color: colors.invalid },
    ]),
  );
}

function emptyTolerantJsonLinter(): (view: EditorView) => Diagnostic[] {
  const lint = jsonParseLinter();
  return (view) => (view.state.doc.toString().trim() === "" ? [] : lint(view));
}

export function makeJsonEditorExtensions(
  colors: EditorColors,
  isDark: boolean,
): Extension[] {
  return [
    json(),
    linter(emptyTolerantJsonLinter()),
    makeChrome(colors, isDark),
    makeHighlight(colors),
  ];
}
