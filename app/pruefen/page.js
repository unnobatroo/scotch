"use client";

import { useState, useEffect } from "react";
import { ClipboardCheck, ExternalLink, Check, X, BookOpen, FileText, Type, Headphones } from "lucide-react";
import { useAuth } from "../providers";
import { supabase } from "@/lib/supabase";
import { getReferencePages } from "@/lib/db";
import { rankPages } from "@/lib/retrieval";
import { extractPdfText } from "@/lib/pdf";
import { renderMarkdown } from "../components/MarkdownEditor";
import ReferenceLibrary from "../components/ReferenceLibrary";

/** Provider for grading. Prefers the grade-specific choice, then legacy, then Groq. */
function gradeProvider() {
  if (typeof window === "undefined") return "groq";
  return localStorage.getItem("scotch.provider.grade") || localStorage.getItem("scotch.provider") || "groq";
}

const BOOKS = [
  { value: "arbeitsbuch", label: "Arbeitsbuch" },
  { value: "lehrbuch", label: "Lehrbuch" },
  { value: "other", label: "Andere" },
];

/**
 * Prüfen — AI answer-checker backed by the reference library.
 *
 * Workflow: the user uploads their excerpt (PDF with visible page numbers, or
 * pasted text) and picks the book. The client retrieves the most relevant
 * answer-key pages (and transcript pages for listening tasks) from the library,
 * then the LLM grades the work, locates the module/chapter/page, and explains
 * each mistake in German with an article link.
 */
export default function PruefenPage() {
  const { user } = useAuth();
  const [libVersion, setLibVersion] = useState(0); // bump to note library changes
  const [book, setBook] = useState("arbeitsbuch");
  const [listening, setListening] = useState(false);
  const [tab, setTab] = useState("pdf");
  const [excerpt, setExcerpt] = useState("");
  const [fileName, setFileName] = useState("");
  const [provider, setProvider] = useState("groq");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => setProvider(gradeProvider()), []);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setErr(null); setBusy(true); setStatus("PDF wird gelesen…");
    try {
      const t = await extractPdfText(file, (p, total) => setStatus(`Seite ${p}/${total}…`));
      setExcerpt(t); setStatus(`${t.split(/\s+/).length} Wörter gelesen.`);
    } catch (e2) {
      setErr("PDF konnte nicht gelesen werden: " + e2.message);
    } finally { setBusy(false); }
  }

  async function grade() {
    setErr(null); setResult(null);
    if (!excerpt.trim()) { setErr("Bitte zuerst deine Aufgabe (PDF oder Text) hochladen."); return; }
    setBusy(true); setStatus("Passende Lösungen werden gesucht…");
    try {
      const keyPages = await getReferencePages(book, "answer_key");
      if (keyPages.length === 0) {
        throw new Error(`Kein Lösungsschlüssel für „${BOOKS.find((b) => b.value === book)?.label}". Lade ihn oben unter „Referenzmaterial" hoch.`);
      }
      const topKey = rankPages(excerpt, keyPages, 6, 9000);
      let keyText = topKey.map((p) => `[Lösungen S.${p.page}]\n${p.content}`).join("\n\n");

      if (listening) {
        const tPages = await getReferencePages(book, "transcript");
        const topT = rankPages(excerpt, tPages, 3, 4000);
        if (topT.length) keyText += "\n\n=== TRANSKRIPTE ===\n" + topT.map((p) => `[Transkript S.${p.page}]\n${p.content}`).join("\n\n");
      }

      setStatus("KI korrigiert…");
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider,
          answers: excerpt,
          key: keyText,
          context: `Buch: ${BOOKS.find((b) => b.value === book)?.label}${listening ? " · Hörübung (Transkript einbezogen)" : ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Prüfen.");
      setResult(data.result);
      supabase.from("grader_results").insert({
        user_id: user.id, modul: data.result.modul || "", kapitel: data.result.kapitel || "",
        page: data.result.page || "", summary: data.result.summary || "", details: data.result.results || [],
      }).then(() => {});
    } catch (e) { setErr(e.message); } finally { setBusy(false); setStatus(null); }
  }

  const wrong = (result?.results || []).filter((r) => !r.is_correct);
  const right = (result?.results || []).filter((r) => r.is_correct);

  return (
    <div>
      <h1 className="h1">Prüfen</h1>
      <ReferenceLibrary userId={user.id} onChange={() => setLibVersion((v) => v + 1)} />

      <p className="muted small" style={{ marginTop: 0 }}>
        Lade deine bearbeitete Aufgabe hoch (mit sichtbarer Seitenzahl). Die KI sucht die passende
        Lösung, korrigiert dich und erklärt deine Fehler. Anbieter: <strong>{provider}</strong>.
      </p>
      {err && <div className="banner banner-err" style={{ marginBottom: 12 }}>{err}</div>}

      <div className={`split ${result ? "has-result" : ""}`}>
        <div className="card pad">
          <div className="grid2">
            <div className="field">
              <label>Buch</label>
              <select className="select" value={book} onChange={(e) => setBook(e.target.value)}>
                {BOOKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Typ</label>
              <label className="btn" style={{ justifyContent: "flex-start", gap: 8 }}>
                <input type="checkbox" checked={listening} onChange={(e) => setListening(e.target.checked)} />
                <Headphones size={15} /> Hörübung
              </label>
            </div>
          </div>

          <div className="seg" style={{ marginBottom: 12 }}>
            <button className={`seg-btn ${tab === "pdf" ? "active" : ""}`} onClick={() => setTab("pdf")}><FileText size={15} /> PDF</button>
            <button className={`seg-btn ${tab === "text" ? "active" : ""}`} onClick={() => setTab("text")}><Type size={15} /> Text</button>
          </div>

          {tab === "pdf" ? (
            <label className="dropzone" style={{ marginBottom: 12 }}>
              <input type="file" accept="application/pdf" hidden onChange={onFile} />
              <div className="dropzone-inner">
                <FileText size={28} />
                <strong>{fileName || "Aufgabe als PDF"}</strong>
                <span className="small muted">Tippen zum Hochladen</span>
              </div>
            </label>
          ) : (
            <div className="field">
              <label>Deine Antworten</label>
              <textarea className="textarea" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder={"S. 42, Übung 3\n1. Ich gehe in der Schule.\n2. …"} />
            </div>
          )}

          {status && <p className="small muted">{status}</p>}
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={grade} disabled={busy || !excerpt.trim()}>
            <ClipboardCheck size={17} /> {busy ? "Arbeitet…" : "Antworten prüfen"}
          </button>
        </div>

        {result && (
          <div>
            <div className="card pad" style={{ marginBottom: 14 }}>
              <div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
                {result.modul && <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}>Modul: {result.modul}</span>}
                {result.kapitel && <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}>Kapitel: {result.kapitel}</span>}
                {result.page && <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}>Seite: {result.page}</span>}
              </div>
              <p style={{ margin: "0 0 4px" }}>
                <span className="g-das"><Check size={15} style={{ verticalAlign: "-2px" }} /> {right.length} richtig</span>{"  ·  "}
                <span className="g-die"><X size={15} style={{ verticalAlign: "-2px" }} /> {wrong.length} falsch</span>
              </p>
              {result.summary && <p className="muted small" style={{ marginBottom: 0 }}>{result.summary}</p>}
            </div>

            {wrong.length > 0 && <div className="h2">Fehler</div>}
            {wrong.map((r, idx) => (
              <div key={idx} className="card pad" style={{ marginBottom: 10, borderLeft: "4px solid var(--die)" }}>
                <div className="between">
                  <strong>Nr. {r.nr}</strong>
                  {r.topic && <span className="chip" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{r.topic}</span>}
                </div>
                <p className="small" style={{ margin: "6px 0" }}>
                  <span className="g-die">Du: {r.your_answer}</span><br />
                  <span className="g-das">Richtig: {r.correct_answer}</span>
                </p>
                {r.explanation_de && <div className="md small" dangerouslySetInnerHTML={{ __html: renderMarkdown(r.explanation_de) }} />}
                {r.article_url && (
                  <a className="row small" style={{ gap: 5 }} href={r.article_url} target="_blank" rel="noopener noreferrer">
                    <BookOpen size={14} /> Artikel zu „{r.topic || "diesem Thema"}" <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}

            {right.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary className="small muted">{right.length} richtige Antworten anzeigen</summary>
                {right.map((r, idx) => (
                  <div key={idx} className="small" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span className="g-das"><Check size={14} style={{ verticalAlign: "-2px" }} /></span> Nr. {r.nr}: {r.your_answer}
                  </div>
                ))}
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
