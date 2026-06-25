"use client";

import { useEffect, useState, useCallback } from "react";
import { listDecks, dueCards, reviewCard } from "@/lib/db";
import CardView from "../components/CardView";

/**
 * Study mode. Pulls cards that are due (Leitner spaced repetition), shows them
 * one at a time, lets the user flip and self-grade. Correct answers promote the
 * card to a higher box (longer interval); wrong answers reset it to box 1.
 */
export default function LernenPage() {
  const [decks, setDecks] = useState([]);
  const [deckId, setDeckId] = useState("");
  const [queue, setQueue] = useState([]);
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ right: 0, wrong: 0 });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    listDecks().then(setDecks).catch(() => {});
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    setStarted(true);
    try {
      const cards = await dueCards(deckId || null);
      setQueue(cards);
      setI(0);
      setReveal(false);
      setStats({ right: 0, wrong: 0 });
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  async function grade(correct) {
    const card = queue[i];
    setStats((s) => ({ right: s.right + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }));
    try {
      await reviewCard(card, correct);
    } catch {
      /* keep going even if the network write fails */
    }
    setReveal(false);
    setI((n) => n + 1);
  }

  if (!started) {
    return (
      <div>
        <h1 className="h1">Lernen</h1>
        <div className="card" style={{ padding: 18 }}>
          <p className="muted small" style={{ marginTop: 0 }}>
            Wiederhole fällige Karten. Du bewertest dich selbst — richtig beantwortete Karten
            kommen seltener, falsche öfter zurück (Leitner-System).
          </p>
          <div className="field">
            <label>Deck</label>
            <select className="select" value={deckId} onChange={(e) => setDeckId(e.target.value)}>
              <option value="">Alle Decks</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={start}>
            Lernsitzung starten
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div>;
  }

  // Session finished (or nothing was due).
  if (i >= queue.length) {
    return (
      <div>
        <h1 className="h1">Geschafft 🎉</h1>
        <div className="card" style={{ padding: 18 }}>
          {queue.length === 0 ? (
            <p className="muted">Keine fälligen Karten. Komm später wieder oder füge neue Karten hinzu.</p>
          ) : (
            <p>
              {queue.length} Karten wiederholt · <span className="g-das">{stats.right} richtig</span> ·{" "}
              <span className="g-die">{stats.wrong} falsch</span>
            </p>
          )}
          <button className="btn btn-primary" onClick={start} style={{ marginRight: 8 }}>
            Nochmal
          </button>
          <button className="btn" onClick={() => setStarted(false)}>Zurück</button>
        </div>
      </div>
    );
  }

  const card = queue[i];
  return (
    <div>
      <div className="between">
        <span className="small muted">{i + 1} / {queue.length}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setStarted(false)}>Beenden</button>
      </div>

      <div style={{ margin: "12px 0" }}>
        <CardView card={card} reveal={reveal} onClick={() => setReveal((r) => !r)} />
      </div>

      {!reveal ? (
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setReveal(true)}>
          Antwort zeigen
        </button>
      ) : (
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-danger grow" onClick={() => grade(false)}>Falsch</button>
          <button className="btn btn-primary grow" style={{ background: "var(--das)", borderColor: "var(--das)" }} onClick={() => grade(true)}>
            Richtig
          </button>
        </div>
      )}
    </div>
  );
}
