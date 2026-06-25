"use client";

import { genderStyle } from "@/lib/german";

/**
 * Coloured chip showing a noun's gender using the project colour system:
 * der=blue, die=pink-red, das=green, plural-only=yellow.
 */
export function GenderChip({ gender }) {
  const g = genderStyle(gender);
  return (
    <span className="chip" style={{ color: g.color, background: g.bg, borderColor: g.border }}>
      {g.label} · {g.name}
    </span>
  );
}

/**
 * Renders a single flashcard.
 *
 * @param {object} props
 * @param {object} props.card   The card record.
 * @param {boolean} [props.reveal=true]  When false, only the prompt side is shown
 *   (used by study mode before the user flips the card).
 * @param {boolean} [props.onClick]  Optional click handler (e.g. flip).
 */
export default function CardView({ card, reveal = true, onClick }) {
  const isNoun = card.card_type === "noun";
  const g = isNoun ? genderStyle(card.noun_gender) : null;
  const accent = g ? g.color : "var(--accent)";

  // Front side: the meaning / prompt the learner sees first.
  const frontText =
    card.prompt ||
    (isNoun ? card.noun_word : card.card_type === "verb" ? card.verb_infinitiv : card.answer);

  return (
    <div
      className="flash"
      onClick={onClick}
      style={{ borderColor: reveal ? accent : "var(--border)" }}
    >
      {card.image_url && <img src={card.image_url} alt="" />}

      {!reveal ? (
        <>
          <div className="word">{frontText || "—"}</div>
          {card.prompt && isNoun && <div className="sub">Nomen — Artikel & Plural?</div>}
          {card.prompt && card.card_type === "verb" && <div className="sub">Verb — Stammformen?</div>}
          <div className="hint">Tippen zum Umdrehen</div>
        </>
      ) : (
        <>
          {isNoun && (
            <>
              <div className="word">
                <span className={`g-${card.noun_gender || "der"}`}>{g.label.split(" ")[0]}</span>{" "}
                {card.noun_word}
              </div>
              <div className="sub">
                Sg.: {card.noun_singular || card.noun_word || "—"} · Pl.:{" "}
                {card.noun_plural || "—"}
              </div>
              <div style={{ marginTop: 8 }}>
                <GenderChip gender={card.noun_gender} />
              </div>
            </>
          )}

          {card.card_type === "verb" && (
            <>
              <div className="word">{card.verb_infinitiv || "—"}</div>
              <div className="forms">
                <div className="formbox">
                  <div className="lab">Infinitiv</div>
                  <div className="val">{card.verb_infinitiv || "—"}</div>
                </div>
                <div className="formbox">
                  <div className="lab">Präteritum</div>
                  <div className="val">{card.verb_praeteritum || "—"}</div>
                </div>
                <div className="formbox">
                  <div className="lab">Partizip II</div>
                  <div className="val">
                    {card.verb_aux ? `${card.verb_aux} ` : ""}
                    {card.verb_partizip || "—"}
                  </div>
                </div>
              </div>
            </>
          )}

          {card.card_type === "other" && (
            <>
              <div className="word">{card.answer || "—"}</div>
              {card.prompt && <div className="sub">{card.prompt}</div>}
            </>
          )}

          {card.prompt && card.card_type !== "other" && (
            <div className="sub" style={{ marginTop: 8 }}>
              {card.prompt}
            </div>
          )}
          {card.example && (
            <div className="small muted" style={{ marginTop: 10, fontStyle: "italic" }}>
              „{card.example}“
            </div>
          )}
        </>
      )}
    </div>
  );
}
