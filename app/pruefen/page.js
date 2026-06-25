"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../providers";
import { supabase } from "@/lib/supabase";
import { renderMarkdown } from "../components/MarkdownEditor";

/** Read the saved provider choice (set on the settings page). */
function savedProvider() {
  if (typeof window === "undefined") return "anthropic";
  return localStorage.getItem("scotch.provider") || "anthropic";
}

/**
 * Prüfen — AI answer-checker. The learner pastes their answers and the official
 * key; the server route grades them, identifies the module/chapter/page, explains
 * mistakes in German and links to an article. Results are saved for reference.
 */
export default function PruefenPage() {
  const { user } = useAuth();
  const [context, setContext] = useState("");
  const [answers, setAnswers] = useState("");
  const [key, setKey] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => setProvider(savedProvider()), []);

  async function grade() {
    setErr(null);
    setResult(null);
    if (!answers.trim() || !key.trim()) {
      setErr("Bitte deine Antworten und den Lösungsschlüssel eingeben.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, context, answers, key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Prüfen.");
      setResult(data.result);
      // Best-effort save; ignore failures so the user still sees feedback.
      supabase
        .from("grader_results")
        .insert({
          user_id: user.id,
          modul: data.result.modul || "",
          kapitel: data.result.kapitel || "",
          page: data.result.page || "",
          summary: data.result.summary || "",
          details: data.result.results || [],
        })
        .then(() => {});
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const wrong = (result?.results || []).filter((r) => !r.is_correct);
  const right = (result?.results || []).filter((r) => r.is_correct);

  return (
    <div>
      <h1 className="h1">Prüfen</h1>
      <p className="muted small" style={{ marginTop: 0 }}>
        Füge deine Antworten und den Lösungsschlüssel ein. Die KI findet Modul, Kapitel und
        Seite, zeigt deine Fehler und verlinkt eine Erklärung auf Deutsch. Anbieter:{" "}
        <strong>{provider}</strong> (in den Einstellungen änderbar).
      </p>

      {err && <div className="banner banner-err" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="field">
        <label>Kontext (optional) — Buch / Modul</label>
        <input className="input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="z. B. Aspekte neu B2, Modul 3" />
      </div>
      <div className="field">
        <label>Deine Antworten</label>
        <textarea className="textarea" value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder={"1. Ich gehe in der Schule.\n2. Er hat gegessen."} />
      </div>
      <div className="field">
        <label>Lösungsschlüssel</label>
        <textarea className="textarea" value={key} onChange={(e) => setKey(e.target.value)} placeholder={"1. Ich gehe in die Schule.\n2. Er hat gegessen."} />
      </div>

      <button className="btn btn-primary" style={{ width: "100%" }} onClick={grade} disabled={busy}>
        {busy ? "Prüft…" : "Antworten prüfen"}
      </button>

      {result && (
        <div className="section" style={{ marginTop: 20 }}>
          <div className="card" style={{ padding: 16, marginBottom: 14 }}>
            <div className="row wrap" style={{ gap: 8 }}>
              {result.modul && <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>Modul: {result.modul}</span>}
              {result.kapitel && <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>Kapitel: {result.kapitel}</span>}
              {result.page && <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>Seite: {result.page}</span>}
            </div>
            <p style={{ marginBottom: 0 }}>
              <span className="g-das">{right.length} richtig</span> ·{" "}
              <span className="g-die">{wrong.length} falsch</span>
            </p>
            {result.summary && <p className="muted small" style={{ marginBottom: 0 }}>{result.summary}</p>}
          </div>

          {wrong.length > 0 && <div className="h2">Fehler</div>}
          {wrong.map((r, idx) => (
            <div key={idx} className="card" style={{ padding: 14, marginBottom: 10, borderLeft: "4px solid var(--die)" }}>
              <div className="between">
                <strong>Nr. {r.nr}</strong>
                {r.topic && <span className="chip" style={{ background: "var(--bg)", color: "var(--muted)" }}>{r.topic}</span>}
              </div>
              <p className="small" style={{ margin: "6px 0" }}>
                <span className="g-die">Du: {r.your_answer}</span><br />
                <span className="g-das">Richtig: {r.correct_answer}</span>
              </p>
              {r.explanation_de && (
                <div className="md small" dangerouslySetInnerHTML={{ __html: renderMarkdown(r.explanation_de) }} />
              )}
              {r.article_url && (
                <a className="small" href={r.article_url} target="_blank" rel="noopener noreferrer">
                  → Artikel zu „{r.topic || "diesem Thema"}" lesen
                </a>
              )}
            </div>
          ))}

          {right.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary className="small muted">{right.length} richtige Antworten anzeigen</summary>
              {right.map((r, idx) => (
                <div key={idx} className="small" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="g-das">✓</span> Nr. {r.nr}: {r.your_answer}
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
