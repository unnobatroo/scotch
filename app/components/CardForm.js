"use client";

import { useState } from "react";
import { CARD_TYPES, GENDERS } from "@/lib/german";
import { uploadCardImage } from "@/lib/db";

/** Build a blank card payload, optionally seeded from an existing card. */
function initialState(card) {
  return {
    card_type: card?.card_type || "noun",
    prompt: card?.prompt || "",
    answer: card?.answer || "",
    example: card?.example || "",
    image_url: card?.image_url || "",
    noun_word: card?.noun_word || "",
    noun_gender: card?.noun_gender || "der",
    noun_singular: card?.noun_singular || "",
    noun_plural: card?.noun_plural || "",
    verb_infinitiv: card?.verb_infinitiv || "",
    verb_praeteritum: card?.verb_praeteritum || "",
    verb_partizip: card?.verb_partizip || "",
    verb_aux: card?.verb_aux || "haben",
  };
}

/**
 * Modal form for creating or editing a flashcard. Shows different fields per
 * card type (Nomen / Verb / Sonstiges) and supports image upload.
 *
 * @param {object} props
 * @param {object|null} props.card  Existing card to edit, or null to create.
 * @param {string} props.userId
 * @param {(payload: object) => Promise<void>} props.onSave
 * @param {() => void} props.onClose
 */
export default function CardForm({ card, userId, onSave, onClose }) {
  const [f, setF] = useState(() => initialState(card));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadCardImage(userId, file);
      set("image_url", url);
    } catch (e2) {
      setErr("Bild-Upload fehlgeschlagen: " + e2.message);
    } finally {
      setUploading(false);
    }
  }

  function validate() {
    if (f.card_type === "noun" && !f.noun_word.trim()) return "Bitte das Nomen eingeben.";
    if (f.card_type === "verb" && !f.verb_infinitiv.trim()) return "Bitte den Infinitiv eingeben.";
    if (f.card_type === "other" && !f.answer.trim() && !f.prompt.trim())
      return "Bitte Vorder- oder Rückseite eingeben.";
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setBusy(true);
    try {
      await onSave(f);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 14 }}>
          <div className="h2" style={{ margin: 0 }}>{card ? "Karte bearbeiten" : "Neue Karte"}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {err && <div className="banner banner-err" style={{ marginBottom: 12 }}>{err}</div>}

        <form onSubmit={submit}>
          {/* Type selector */}
          <div className="field">
            <label>Kartentyp</label>
            <div className="row">
              {CARD_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  className={`btn btn-sm ${f.card_type === t.value ? "btn-primary" : ""}`}
                  onClick={() => set("card_type", t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* NOUN fields */}
          {f.card_type === "noun" && (
            <>
              <div className="field">
                <label>Genus (Farbe)</label>
                <div className="row wrap">
                  {Object.entries(GENDERS).map(([key, g]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => set("noun_gender", key)}
                      className="chip"
                      style={{
                        color: g.color,
                        background: f.noun_gender === key ? g.bg : "transparent",
                        borderColor: f.noun_gender === key ? g.color : "var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Nomen (ohne Artikel)</label>
                <input className="input" value={f.noun_word} onChange={(e) => set("noun_word", e.target.value)} placeholder="Tisch" />
              </div>
              <div className="grid2">
                <div className="field">
                  <label>Singular</label>
                  <input className="input" value={f.noun_singular} onChange={(e) => set("noun_singular", e.target.value)} placeholder="der Tisch" />
                </div>
                <div className="field">
                  <label>Plural</label>
                  <input className="input" value={f.noun_plural} onChange={(e) => set("noun_plural", e.target.value)} placeholder="die Tische" />
                </div>
              </div>
            </>
          )}

          {/* VERB fields */}
          {f.card_type === "verb" && (
            <>
              <div className="grid3">
                <div className="field">
                  <label>Infinitiv</label>
                  <input className="input" value={f.verb_infinitiv} onChange={(e) => set("verb_infinitiv", e.target.value)} placeholder="gehen" />
                </div>
                <div className="field">
                  <label>Präteritum</label>
                  <input className="input" value={f.verb_praeteritum} onChange={(e) => set("verb_praeteritum", e.target.value)} placeholder="ging" />
                </div>
                <div className="field">
                  <label>Partizip II</label>
                  <input className="input" value={f.verb_partizip} onChange={(e) => set("verb_partizip", e.target.value)} placeholder="gegangen" />
                </div>
              </div>
              <div className="field">
                <label>Hilfsverb</label>
                <select className="select" value={f.verb_aux} onChange={(e) => set("verb_aux", e.target.value)}>
                  <option value="haben">haben</option>
                  <option value="sein">sein</option>
                </select>
              </div>
            </>
          )}

          {/* OTHER fields */}
          {f.card_type === "other" && (
            <>
              <div className="field">
                <label>Vorderseite (Frage)</label>
                <input className="input" value={f.prompt} onChange={(e) => set("prompt", e.target.value)} placeholder="z. B. Frage auf der Vorderseite" />
              </div>
              <div className="field">
                <label>Rückseite (Antwort)</label>
                <input className="input" value={f.answer} onChange={(e) => set("answer", e.target.value)} placeholder="danke / vielen Dank" />
              </div>
            </>
          )}

          {/* Shared: meaning + example + image */}
          {f.card_type !== "other" && (
            <div className="field">
              <label>Bedeutung / Übersetzung (Vorderseite)</label>
              <input className="input" value={f.prompt} onChange={(e) => set("prompt", e.target.value)} placeholder="the table / to go" />
            </div>
          )}
          <div className="field">
            <label>Beispielsatz (optional)</label>
            <input className="input" value={f.example} onChange={(e) => set("example", e.target.value)} placeholder="Der Tisch ist groß." />
          </div>

          <div className="field">
            <label>Bild (optional)</label>
            {f.image_url && (
              <div className="row" style={{ marginBottom: 6 }}>
                <img src={f.image_url} alt="" style={{ height: 56, borderRadius: 8 }} />
                <button type="button" className="btn btn-sm btn-danger" onClick={() => set("image_url", "")}>
                  Entfernen
                </button>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImage} />
            {uploading && <span className="small muted">Lädt hoch…</span>}
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 6 }}>
            <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
            <button className="btn btn-primary" disabled={busy || uploading}>
              {busy ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
