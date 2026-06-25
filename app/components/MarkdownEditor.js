"use client";

import { useMemo, useState } from "react";
import { Pencil, Columns2, Eye } from "lucide-react";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

/**
 * Minimal allowlist sanitiser for the HTML `marked` produces. Strips <script>,
 * inline event handlers and javascript: URLs before using dangerouslySetInnerHTML.
 * @param {string} html
 */
function sanitize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "")
    .replace(/ on[a-z]+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/** Render Markdown to safe HTML. */
export function renderMarkdown(md) {
  return sanitize(marked.parse(md || ""));
}

/**
 * Obsidian-style Markdown editor with three modes:
 *  - "split"  (default): source on the left, live-rendered preview on the right,
 *             updating on every keystroke — the live-preview experience.
 *  - "write": source only.
 *  - "preview": rendered only.
 * On narrow screens the split stacks vertically.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 */
export default function MarkdownEditor({ value, onChange }) {
  const [mode, setMode] = useState("split");
  const html = useMemo(() => renderMarkdown(value), [value]);

  const Source = (
    <textarea
      className="ed-source"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={"# Überschrift\n\nSchreibe hier in **Markdown** …"}
      spellCheck={false}
    />
  );
  const Preview = <div className="md ed-preview" dangerouslySetInnerHTML={{ __html: html }} />;

  return (
    <div className="editor-shell">
      <div className="seg" style={{ alignSelf: "flex-start" }}>
        <button type="button" className={`seg-btn ${mode === "write" ? "active" : ""}`} onClick={() => setMode("write")}>
          <Pencil size={15} /> Schreiben
        </button>
        <button type="button" className={`seg-btn ${mode === "split" ? "active" : ""}`} onClick={() => setMode("split")}>
          <Columns2 size={15} /> Geteilt
        </button>
        <button type="button" className={`seg-btn ${mode === "preview" ? "active" : ""}`} onClick={() => setMode("preview")}>
          <Eye size={15} /> Vorschau
        </button>
      </div>

      {mode === "split" ? (
        <div className="ed-split split">
          {Source}
          {Preview}
        </div>
      ) : mode === "write" ? (
        <div className="ed-split">{Source}</div>
      ) : (
        <div className="ed-split">{Preview}</div>
      )}
    </div>
  );
}
