"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

/**
 * Very small allowlist sanitiser for the HTML that `marked` produces. This is a
 * personal, single-user app, but we still strip <script>, inline event handlers
 * and javascript: URLs as defence-in-depth before using dangerouslySetInnerHTML.
 * @param {string} html
 * @returns {string}
 */
function sanitize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "")
    .replace(/ on[a-z]+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Render Markdown to safe HTML.
 * @param {string} md
 */
export function renderMarkdown(md) {
  return sanitize(marked.parse(md || ""));
}

/**
 * Markdown editor with a write / preview toggle. Mobile-friendly: on small
 * screens the two modes are tabs; the parent decides when to persist via onChange.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 */
export default function MarkdownEditor({ value, onChange }) {
  const [tab, setTab] = useState("write");
  const html = useMemo(() => renderMarkdown(value), [value]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <button
          className={`btn btn-sm ${tab === "write" ? "btn-primary" : ""}`}
          onClick={() => setTab("write")}
          type="button"
        >
          Schreiben
        </button>
        <button
          className={`btn btn-sm ${tab === "preview" ? "btn-primary" : ""}`}
          onClick={() => setTab("preview")}
          type="button"
        >
          Vorschau
        </button>
      </div>

      {tab === "write" ? (
        <textarea
          className="textarea"
          style={{ minHeight: 320 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="# Überschrift&#10;&#10;Schreibe hier in **Markdown** …"
        />
      ) : (
        <div className="md" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
