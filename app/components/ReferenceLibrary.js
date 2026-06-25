"use client";

import { useEffect, useState, useCallback } from "react";
import { BookMarked, Headphones, Trash2, Upload, ChevronDown, ChevronRight } from "lucide-react";
import { extractPdfPages } from "@/lib/pdf";
import {
  listReferenceDocs, createReferenceDoc, insertReferencePages, deleteReferenceDoc,
} from "@/lib/db";

const BOOKS = [
  { value: "arbeitsbuch", label: "Arbeitsbuch" },
  { value: "lehrbuch", label: "Lehrbuch" },
  { value: "other", label: "Andere" },
];
const KINDS = [
  { value: "answer_key", label: "Lösungsschlüssel", Icon: BookMarked },
  { value: "transcript", label: "Transkript", Icon: Headphones },
];

/**
 * Manager for the grader's reference material. The user uploads answer-key and
 * transcript PDFs once; each is split per page (so the grader can retrieve only
 * the relevant pages) and stored in Supabase. Collapsible to stay out of the way.
 *
 * @param {{userId: string, onChange?: () => void}} props
 */
export default function ReferenceLibrary({ userId, onChange }) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState([]);
  const [kind, setKind] = useState("answer_key");
  const [book, setBook] = useState("arbeitsbuch");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try { setDocs(await listReferenceDocs()); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBusy(true); setErr(null);
    setStatus("PDF wird gelesen…");
    try {
      const pages = await extractPdfPages(file, (p, t) => setStatus(`Seite ${p}/${t}…`));
      const nonEmpty = pages.filter((p) => p.content.length > 2);
      const doc = await createReferenceDoc(userId, {
        kind, book, title: file.name.replace(/\.pdf$/i, ""), page_count: nonEmpty.length,
      });
      setStatus("Wird gespeichert…");
      // Batch the page rows to keep each insert small.
      const rows = nonEmpty.map((p) => ({ user_id: userId, doc_id: doc.id, page: p.page, content: p.content }));
      for (let i = 0; i < rows.length; i += 100) await insertReferencePages(rows.slice(i, i + 100));
      setStatus(null);
      await load();
      onChange?.();
    } catch (e2) {
      setErr("Upload fehlgeschlagen: " + e2.message);
    } finally { setBusy(false); }
  }

  async function remove(d) {
    if (!confirm(`„${d.title}" entfernen?`)) return;
    await deleteReferenceDoc(d.id); await load(); onChange?.();
  }

  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <button className="between" style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <span className="h2" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <BookMarked size={18} /> Referenzmaterial
        </span>
        <span className="row small muted">{docs.length} Dateien {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          <p className="small muted" style={{ marginTop: 0 }}>
            Lade Lösungsschlüssel und Transkripte für deine Bücher hoch — einmalig. Beim Prüfen
            findet die KI automatisch die passenden Seiten.
          </p>
          {err && <div className="banner banner-err" style={{ marginBottom: 10 }}>{err}</div>}

          <div className="grid2">
            <div className="field">
              <label>Typ</label>
              <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Buch</label>
              <select className="select" value={book} onChange={(e) => setBook(e.target.value)}>
                {BOOKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>

          <label className="btn" style={{ width: "100%", marginBottom: 10 }}>
            <Upload size={16} /> {busy ? (status || "Arbeitet…") : "PDF hochladen"}
            <input type="file" accept="application/pdf" hidden onChange={onFile} disabled={busy} />
          </label>

          {docs.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              {docs.map((d) => {
                const K = KINDS.find((k) => k.value === d.kind) || KINDS[0];
                return (
                  <div key={d.id} className="between" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px" }}>
                    <span className="row small" style={{ gap: 8 }}>
                      <K.Icon size={15} style={{ color: "var(--accent)" }} />
                      <span>{d.title}</span>
                      <span className="chip" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{BOOKS.find((b) => b.value === d.book)?.label} · {d.page_count} S.</span>
                    </span>
                    <button className="btn btn-ghost icon-btn" onClick={() => remove(d)} aria-label="Entfernen"><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
