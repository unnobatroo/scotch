"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, Play, RotateCcw, Eye, ChevronLeft, PartyPopper } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ right: 0, wrong: 0 });
  const [started, setStarted] = useState(false);

  useEffect(() => { listDecks().then(setDecks).catch(() => {}); }, []);

  const start = useCallback(async () => {
    setLoading(true); setStarted(true);
    try {
      const cards = await dueCards(deckId || null);
      setQueue(cards); setI(0); setReveal(false); setStats({ right: 0, wrong: 0 });
    } finally { setLoading(false); }
  }, [deckId]);

  async function grade(correct) {
    const card = queue[i];
    setStats((s) => ({ right: s.right + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }));
    try { await reviewCard(card, correct); } catch { /* keep going */ }
    setReveal(false); setI((n) => n + 1);
  }

  const Wrap = ({ children }) => (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>{children}</div>
  );

  if (!started) {
    return (
      <Wrap>
        <h1 className="h1">Lernen</h1>
        <div className="card pad">
          <p className="muted small" style={{ marginTop: 0 }}>
            Wiederhole fällige Karten. Du bewertest dich selbst — richtige Karten kommen seltener,
            falsche öfter zurück (Leitner-System).
          </p>
          <div className="field">
            <label>Deck</label>
            <select className="select" value={deckId} onChange={(e) => setDeckId(e.target.value)}>
              <option value="">Alle Decks</option>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={start}>
            <Play size={17} /> Lernsitzung starten
          </button>
        </div>
      </Wrap>
    );
  }

  if (loading) return <div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div>;

  if (i >= queue.length) {
    return (
      <Wrap>
        <h1 className="h1">Geschafft</h1>
        <div className="card pad" style={{ textAlign: "center" }}>
          <PartyPopper className="empty-ico" size={40} />
          {queue.length === 0 ? (
            <p className="muted">Keine fälligen Karten. Komm später wieder oder füge neue hinzu.</p>
          ) : (
            <p>{queue.length} Karten wiederholt · <span className="g-das">{stats.right} richtig</span> · <span className="g-die">{stats.wrong} falsch</span></p>
          )}
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={start}><RotateCcw size={16} /> Nochmal</button>
            <button className="btn" onClick={() => setStarted(false)}><ChevronLeft size={16} /> Zurück</button>
          </div>
        </div>
      </Wrap>
    );
  }

  const card = queue[i];
  const pct = Math.round((i / queue.length) * 100);
  return (
    <Wrap>
      <div className="between" style={{ marginBottom: 8 }}>
        <span className="small muted">{i + 1} / {queue.length}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setStarted(false)}><X size={15} /> Beenden</button>
      </div>
      <div className="progress" style={{ marginBottom: 14 }}><span style={{ width: `${pct}%` }} /></div>

      <CardView card={card} reveal={reveal} onClick={() => setReveal((r) => !r)} />

      <div style={{ marginTop: 14 }}>
        {!reveal ? (
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setReveal(true)}>
            <Eye size={17} /> Antwort zeigen
          </button>
        ) : (
          <div className="row">
            <button className="btn btn-danger grow" onClick={() => grade(false)}><X size={17} /> Falsch</button>
            <button className="btn btn-primary grow" style={{ background: "var(--das)", borderColor: "var(--das)", boxShadow: "none" }} onClick={() => grade(true)}>
              <Check size={17} /> Richtig
            </button>
          </div>
        )}
      </div>
    </Wrap>
  );
}
