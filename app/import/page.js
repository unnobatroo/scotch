"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Type, FileUp, Sparkles, PartyPopper, ChevronLeft, BookOpen, GraduationCap } from "lucide-react";
import { useAuth } from "../providers";
import { extractPdfText } from "@/lib/pdf";
import { fetchImage } from "@/lib/openverse";
import { createDeck, createCard } from "@/lib/db";
import CardView from "../components/CardView";

/** Read the import provider (set on the settings page). Defaults to Groq. */
function savedProvider() {
  if (typeof window === "undefined") return "groq";
  return localStorage.getItem("scotch.provider.parse") || localStorage.getItem("scotch.provider") || "groq";
}

/**
 * PDF / text → deck importer.
 *
 * Flow: pick a source (PDF upload or pasted text) → extract text → the LLM turns
 * it into structured German cards → Openverse photos are attached → the user
 * reviews, names a deck and saves. Cards can be de-selected before saving.
 */
export default function ImportPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("pdf"); // pdf | text
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [deckName, setDeckName] = useState("");
  const [status, setStatus] = useState(null); // progress string
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [cards, setCards] = useState(null); // null = not analysed yet
  const [saved, setSaved] = useState(null); // saved deck

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setFileName(file.name);
    if (!deckName) setDeckName(file.name.replace(/\.pdf$/i, ""));
    setBusy(true);
    setStatus("PDF wird gelesen…");
    try {
      const t = await extractPdfText(file, (p, total) => setStatus(`Seite ${p}/${total} gelesen…`));
      setText(t);
      setStatus(`${t.split(/\s+/).length} Wörter gefunden. Bereit zum Analysieren.`);
    } catch (e2) {
      setErr("PDF konnte nicht gelesen werden: " + e2.message + ". Du kannst den Text auch einfügen.");
    } finally {
      setBusy(false);
    }
  }

  async function analyse() {
    if (!text.trim()) {
      setErr("Bitte zuerst eine PDF laden oder Text einfügen.");
      return;
    }
    setErr(null);
    setBusy(true);
    setStatus("KI analysiert die Wörter…");
    try {
      const res = await fetch("/api/parse-words", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: savedProvider(), text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyse fehlgeschlagen.");
      const parsed = (data.cards || []).map((c) => ({ ...c, _include: true }));
      setCards(parsed);

      // Attach photos one by one so the user sees progress and we stay polite to the API.
      for (let i = 0; i < parsed.length; i++) {
        if (!parsed[i].image_query) continue;
        setStatus(`Bilder werden gesucht… (${i + 1}/${parsed.length})`);
        const img = await fetchImage(parsed[i].image_query);
        if (img) {
          setCards((prev) => {
            const next = [...prev];
            if (next[i]) next[i] = { ...next[i], image_url: img };
            return next;
          });
        }
      }
      setStatus(null);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function toggle(i) {
    setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, _include: !c._include } : c)));
  }

  async function save() {
    const chosen = cards.filter((c) => c._include);
    if (chosen.length === 0) {
      setErr("Keine Karten ausgewählt.");
      return;
    }
    setBusy(true);
    setStatus("Deck wird gespeichert…");
    setErr(null);
    try {
      const deck = await createDeck(user.id, (deckName || "Import").trim());
      for (const c of chosen) {
        const { _include, image_query, ...fields } = c;
        await createCard({ ...fields, user_id: user.id, deck_id: deck.id });
      }
      setSaved({ deck, count: chosen.length });
    } catch (e2) {
      setErr("Speichern fehlgeschlagen: " + e2.message);
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  /* ---------- success screen ---------- */
  if (saved) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h1 className="h1">Fertig</h1>
        <div className="card pad" style={{ textAlign: "center" }}>
          <PartyPopper className="empty-ico" size={40} />
          <p>
            <strong>{saved.count} Karten</strong> im Deck „{saved.deck.name}" gespeichert.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" href="/karten"><BookOpen size={16} /> Zu den Decks</Link>
            <Link className="btn" href="/lernen"><GraduationCap size={16} /> Jetzt lernen</Link>
          </div>
        </div>
      </div>
    );
  }

  const included = cards?.filter((c) => c._include).length || 0;

  return (
    <div>
      <div className="between">
        <h1 className="h1">PDF importieren</h1>
        <Link className="btn btn-ghost btn-sm" href="/karten"><ChevronLeft size={16} /> Karten</Link>
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Lade eine Wortliste als PDF hoch (oder füge Text ein). Die KI erstellt Karten mit Genus,
        Plural und Verbformen — und sucht passende Fotos.
      </p>

      {err && <div className="banner banner-err" style={{ marginBottom: 12 }}>{err}</div>}

      {!cards && (
        <div className="card pad">
          <div className="seg" style={{ marginBottom: 14 }}>
            <button className={`seg-btn ${tab === "pdf" ? "active" : ""}`} onClick={() => setTab("pdf")}><FileText size={15} /> PDF</button>
            <button className={`seg-btn ${tab === "text" ? "active" : ""}`} onClick={() => setTab("text")}><Type size={15} /> Text</button>
          </div>

          {tab === "pdf" ? (
            <div className="field">
              <label className="dropzone">
                <input type="file" accept="application/pdf" onChange={onFile} hidden />
                <div className="dropzone-inner">
                  <FileUp size={30} />
                  <strong>{fileName || "PDF auswählen"}</strong>
                  <span className="small muted">Tippen zum Hochladen</span>
                </div>
              </label>
            </div>
          ) : (
            <div className="field">
              <label>Wörter / Text einfügen</label>
              <textarea
                className="textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"der Tisch\ndie Lampe\ngehen\n…"}
              />
            </div>
          )}

          <div className="field">
            <label>Deckname</label>
            <input className="input" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="z. B. Wortschatz Kapitel 3" />
          </div>

          {status && <p className="small muted">{status}</p>}

          <button className="btn btn-primary" style={{ width: "100%" }} onClick={analyse} disabled={busy || !text.trim()}>
            <Sparkles size={17} /> {busy ? "Arbeitet…" : "Karten erstellen"}
          </button>
        </div>
      )}

      {cards && (
        <div>
          <div className="between" style={{ marginBottom: 10 }}>
            <span className="small muted">{included} von {cards.length} ausgewählt</span>
            {status && <span className="small muted">{status}</span>}
          </div>

          <div className="field">
            <input className="input" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="Deckname" />
          </div>

          <div className="grid-cards">
            {cards.map((c, i) => (
              <div key={i} style={{ opacity: c._include ? 1 : 0.45 }}>
                <CardView card={c} reveal />
                <div className="row" style={{ justifyContent: "flex-end", marginTop: 6 }}>
                  <button className={`btn btn-sm ${c._include ? "btn-danger" : "btn-primary"}`} onClick={() => toggle(i)}>
                    {c._include ? "Überspringen" : "Aufnehmen"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky-actions">
            <button className="btn" onClick={() => { setCards(null); setStatus(null); }}>Zurück</button>
            <button className="btn btn-primary grow" onClick={save} disabled={busy || included === 0}>
              {busy ? "Speichert…" : `${included} Karten speichern`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
