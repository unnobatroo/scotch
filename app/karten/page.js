"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, FolderOpen, Trash2, Pencil, ChevronLeft, FileUp, Layers } from "lucide-react";
import { useAuth } from "../providers";
import {
  listDecks, createDeck, deleteDeck, deckCounts,
  listCards, createCard, updateCard, deleteCard,
} from "@/lib/db";
import CardView from "../components/CardView";
import CardForm from "../components/CardForm";

/**
 * Flashcards section: manage decks and the cards inside them.
 * Two views in one route — a deck grid, and a single deck's cards.
 */
export default function KartenPage() {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [counts, setCounts] = useState({});
  const [active, setActive] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState(null);

  const loadDecks = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([listDecks(), deckCounts()]);
      setDecks(d); setCounts(c);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDecks(); }, [loadDecks]);

  async function openDeck(deck) {
    setActive(deck); setLoading(true);
    try { setCards(await listCards(deck.id)); }
    catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  async function addDeck() {
    const name = prompt("Name des Decks?");
    if (!name) return;
    try { await createDeck(user.id, name.trim()); loadDecks(); }
    catch (e) { setErr(e.message); }
  }

  async function removeDeck(deck) {
    if (!confirm(`Deck „${deck.name}" und alle Karten löschen?`)) return;
    try { await deleteDeck(deck.id); loadDecks(); } catch (e) { setErr(e.message); }
  }

  async function saveCard(payload) {
    const body = { ...payload, user_id: user.id, deck_id: active.id };
    if (editing) {
      const updated = await updateCard(editing.id, payload);
      setCards((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      const created = await createCard(body);
      setCards((cs) => [created, ...cs]);
    }
    setShowCardForm(false); setEditing(null);
  }

  async function removeCard(card) {
    if (!confirm("Karte löschen?")) return;
    await deleteCard(card.id);
    setCards((cs) => cs.filter((c) => c.id !== card.id));
  }

  /* -------------------- Deck grid -------------------- */
  if (!active) {
    return (
      <div>
        <div className="between">
          <h1 className="h1">Decks</h1>
          <div className="row">
            <Link className="btn btn-sm" href="/import"><FileUp size={16} /> PDF</Link>
            <button className="btn btn-primary btn-sm" onClick={addDeck}><Plus size={16} /> Deck</button>
          </div>
        </div>
        {err && <div className="banner banner-err">{err}</div>}
        {loading ? (
          <div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div>
        ) : decks.length === 0 ? (
          <div className="empty">
            <Layers className="empty-ico" size={40} />
            <p>Noch keine Decks. Lege dein erstes an oder importiere eine PDF-Wortliste.</p>
          </div>
        ) : (
          <div className="grid-cards">
            {decks.map((d) => (
              <div key={d.id} className="card pad">
                <div className="between" style={{ alignItems: "flex-start" }}>
                  <div onClick={() => openDeck(d)} style={{ cursor: "pointer", flex: 1 }}>
                    <div className="h2" style={{ margin: 0 }}>{d.name}</div>
                    <div className="small muted">{counts[d.id] || 0} Karten</div>
                  </div>
                  <button className="btn btn-ghost icon-btn" onClick={() => removeDeck(d)} aria-label="Löschen"><Trash2 size={17} /></button>
                </div>
                <button className="btn btn-sm" style={{ width: "100%", marginTop: 12 }} onClick={() => openDeck(d)}>
                  <FolderOpen size={16} /> Öffnen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* -------------------- Cards in a deck -------------------- */
  return (
    <div>
      <div className="between">
        <button className="btn btn-ghost btn-sm" onClick={() => { setActive(null); loadDecks(); }}>
          <ChevronLeft size={16} /> Decks
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowCardForm(true); }}>
          <Plus size={16} /> Karte
        </button>
      </div>
      <h1 className="h1">{active.name}</h1>
      {err && <div className="banner banner-err">{err}</div>}

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : cards.length === 0 ? (
        <div className="empty">Noch keine Karten in diesem Deck.</div>
      ) : (
        <div className="grid-cards">
          {cards.map((c) => (
            <div key={c.id}>
              <CardView card={c} reveal />
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 6 }}>
                <button className="btn btn-sm" onClick={() => { setEditing(c); setShowCardForm(true); }}><Pencil size={15} /> Bearbeiten</button>
                <button className="btn btn-sm btn-danger" onClick={() => removeCard(c)} aria-label="Löschen"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCardForm && (
        <CardForm card={editing} userId={user.id} onSave={saveCard} onClose={() => { setShowCardForm(false); setEditing(null); }} />
      )}
    </div>
  );
}
