"use client";

import { useEffect, useRef } from "react";
import { EditorState, StateField } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, keymap } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { syntaxTree } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { GFM } from "@lezer/markdown";
import { renderMarkdown } from "./MarkdownEditor";

/**
 * Obsidian-style live-preview Markdown editor (CodeMirror 6).
 *
 * The document text IS Markdown (no lossy conversion — what you edit is saved
 * verbatim). A StateField decorates the document so that:
 *   - formatting marks (#, **, *, `, ~~, >, link [] ()) are HIDDEN unless the
 *     cursor is on that line — so the prose reads as rendered text;
 *   - headings, bold, italic, code, quotes and links are visually styled;
 *   - block elements (tables, images, horizontal rules) render as real HTML
 *     widgets, and reveal their source the moment you click into them.
 *
 * @param {object} props
 * @param {string} props.value              Initial Markdown (uncontrolled; mount
 *                                           with a `key` per note to reset).
 * @param {(v: string) => void} props.onChange
 */
export default function LiveEditor({ value, onChange }) {
  const host = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value || "",
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown({ extensions: [GFM] }),
          EditorView.lineWrapping,
          livePreview,
          editorTheme,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="live-editor" ref={host} />;
}

/* ------------------------- Live-preview decorations ------------------------- */

/** A block widget that renders a slice of Markdown (table / image / hr) as HTML. */
class HtmlWidget extends WidgetType {
  constructor(md) {
    super();
    this.md = md;
  }
  eq(other) {
    return other.md === this.md;
  }
  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "md cm-rendered-block";
    wrap.innerHTML = renderMarkdown(this.md);
    return wrap;
  }
  ignoreEvent() {
    // Let clicks through so the editor can move the cursor in and reveal source.
    return false;
  }
}

const INLINE_STYLE = {
  StrongEmphasis: "cm-strong",
  Emphasis: "cm-em",
  InlineCode: "cm-code",
  Strikethrough: "cm-strike",
  Link: "cm-link",
};
const HIDE_MARKS = new Set([
  "EmphasisMark", "CodeMark", "StrikethroughMark", "HeaderMark", "QuoteMark", "LinkMark",
]);

/** Build the decoration set for the whole document from current state. */
function buildDecorations(state) {
  const deco = [];
  const doc = state.doc;
  const sel = state.selection;
  const activeLines = new Set();
  for (const r of sel.ranges) {
    activeLines.add(doc.lineAt(r.from).number);
    activeLines.add(doc.lineAt(r.to).number);
  }
  const lineActive = (pos) => activeLines.has(doc.lineAt(pos).number);
  const overlapsSel = (from, to) => sel.ranges.some((r) => r.from <= to && r.to >= from);

  try {
    syntaxTree(state).iterate({
      enter: (node) => {
        const { name, from, to } = node;

        // Block widgets: render and skip children unless the cursor is inside.
        if (name === "Table" || name === "Image" || name === "HorizontalRule") {
          if (!overlapsSel(from, to)) {
            const lineFrom = doc.lineAt(from).from;
            const lineTo = doc.lineAt(to).to;
            deco.push(
              Decoration.replace({ widget: new HtmlWidget(doc.sliceString(from, to)), block: true }).range(lineFrom, lineTo)
            );
            return false;
          }
          return;
        }

        // Heading: style the whole line.
        const h = /^ATXHeading(\d)$/.exec(name);
        if (h) {
          deco.push(Decoration.line({ class: `cm-h cm-h${h[1]}` }).range(doc.lineAt(from).from));
          return;
        }

        // Blockquote: style each line.
        if (name === "Blockquote") {
          const a = doc.lineAt(from).number;
          const b = doc.lineAt(to).number;
          for (let i = a; i <= b; i++) deco.push(Decoration.line({ class: "cm-quote" }).range(doc.line(i).from));
          return;
        }

        // Inline content styling.
        if (INLINE_STYLE[name]) {
          deco.push(Decoration.mark({ class: INLINE_STYLE[name] }).range(from, to));
          return;
        }

        // Hide formatting marks unless the cursor is on the same line.
        if (HIDE_MARKS.has(name) || name === "URL") {
          if (from < to && !lineActive(from)) deco.push(Decoration.replace({}).range(from, to));
          return;
        }
      },
    });
  } catch {
    return Decoration.none;
  }

  return Decoration.set(deco, true);
}

/** StateField that holds the live-preview decorations (recomputed on edits/cursor moves). */
const livePreview = StateField.define({
  create: (state) => buildDecorations(state),
  update(value, tr) {
    if (tr.docChanged || tr.selection) return buildDecorations(tr.state);
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** Editor chrome — matches the app's typography and surfaces. */
const editorTheme = EditorView.theme({
  "&": { backgroundColor: "var(--surface)", color: "var(--text)", borderRadius: "13px", border: "1px solid var(--border-strong)" },
  "&.cm-focused": { outline: "none", borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)" },
  ".cm-scroller": { fontFamily: "var(--font-sans)", lineHeight: "1.7", padding: "8px 6px", maxHeight: "70vh" },
  ".cm-content": { padding: "6px 12px", caretColor: "var(--accent)" },
  "&.cm-editor": { fontSize: "16px" },
  ".cm-line": { padding: "1px 0" },
});
