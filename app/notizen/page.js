"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../providers";
import {
  listGroups, createGroup, deleteGroup,
  listNotes, createNote, updateNote, deleteNote,
} from "@/lib/db";
import { SEED_NOTES } from "@/lib/seedNotes";
import MarkdownEditor from "../components/MarkdownEditor";

/**
 * Notes section — a lightweight, Notion-style space: notes grouped into folders,
 * edited in Markdown. Includes a one-click import of the user's Notion German
 * grammar notes (bundled in lib/seedNotes.js).
 */
export default function NotizenPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState(null);
  const saveTimer = useRef(null);

  const active = notes.find((n) => n.id === activeId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, n] = await Promise.all([listGroups(), listNotes()]);
      setGroups(g);
      setNotes(n);
      if (!activeId && n.length) setActiveId(n[0].id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  /* ---- mutations ---- */
  async function newNote(groupId = null) {
    const n = await createNote(user.id, { title: "Neue Notiz", content: "", group_id: groupId });
    setNotes((prev) => [n, ...prev]);
    setActiveId(n.id);
  }

  async function newGroup() {
    const name = prompt("Name der Gruppe?");
    if (!name) return;
    const g = await createGroup(user.id, name.trim());
    setGroups((prev) => [...prev, g]);
  }

  async function removeGroup(g) {
    if (!confirm(`Gruppe „${g.name}" löschen? (Notizen bleiben erhalten)`)) return;
    await deleteGroup(g.id);
    load();
  }

  async function removeNote(n) {
    if (!confirm("Notiz löschen?")) return;
    await deleteNote(n.id);
    setNotes((prev) => prev.filter((x) => x.id !== n.id));
    if (activeId === n.id) setActiveId(null);
  }

  /** Debounced autosave of the active note's title/content. */
  function patchActive(patch) {
    setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, ...patch } : n)));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateNote(activeId, patch).catch((e) => setErr(e.message));
    }, 600);
  }

  async function changeGroup(groupId) {
    const g = groupId || null;
    setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, group_id: g } : n)));
    await updateNote(activeId, { group_id: g });
  }

  /** Import the bundled Notion grammar notes, creating groups as needed. */
  async function importSeed() {
    if (!confirm(`${SEED_NOTES.length} Notizen aus Notion importieren?`)) return;
    setImporting(true);
    setErr(null);
    try {
      // Reuse existing groups by name; create the rest.
      const byName = {};
      for (const g of groups) byName[g.name] = g.id;
      const created = [];
      for (const note of SEED_NOTES) {
        if (!byName[note.group]) {
          const g = await createGroup(user.id, note.group);
          byName[note.group] = g.id;
        }
        const n = await createNote(user.id, {
          title: note.title,
          content: note.content,
          group_id: byName[note.group],
        });
        created.push(n);
      }
      await load();
      if (created[0]) setActiveId(created[0].id);
    } catch (e) {
      setErr("Import fehlgeschlagen: " + e.message);
    } finally {
      setImporting(false);
    }
  }

  /* ---- grouping for the sidebar ---- */
  const ungrouped = notes.filter((n) => !n.group_id);
  const notesByGroup = (gid) => notes.filter((n) => n.group_id === gid);

  return (
    <div>
      <div className="between">
        <h1 className="h1">Notizen</h1>
        <div className="row">
          <button className="btn btn-sm" onClick={newGroup}>+ Gruppe</button>
          <button className="btn btn-primary btn-sm" onClick={() => newNote()}>+ Notiz</button>
        </div>
      </div>
      {err && <div className="banner banner-err">{err}</div>}

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : notes.length === 0 ? (
        <div className="empty">
          <p>Noch keine Notizen.</p>
          <button className="btn btn-primary" onClick={importSeed} disabled={importing}>
            {importing ? "Importiert…" : "📥 Aus Notion importieren"}
          </button>
          <p className="small muted" style={{ marginTop: 10 }}>
            oder lege mit „+ Notiz" eine eigene an.
          </p>
        </div>
      ) : (
        <div className="notes-grid">
          {/* Sidebar */}
          <aside className="note-list">
            {groups.map((g) => (
              <div key={g.id}>
                <div className="between">
                  <div className="group-head">{g.name}</div>
                  <div className="row">
                    <button className="btn btn-ghost btn-sm" title="Notiz hinzufügen" onClick={() => newNote(g.id)}>+</button>
                    <button className="btn btn-ghost btn-sm" title="Gruppe löschen" onClick={() => removeGroup(g)}>✕</button>
                  </div>
                </div>
                {notesByGroup(g.id).map((n) => (
                  <div
                    key={n.id}
                    className={`note-item ${n.id === activeId ? "active" : ""}`}
                    onClick={() => setActiveId(n.id)}
                    style={{ cursor: "pointer", marginBottom: 6 }}
                  >
                    {n.title || "Untitled"}
                  </div>
                ))}
              </div>
            ))}

            {ungrouped.length > 0 && (
              <>
                <div className="group-head">Ohne Gruppe</div>
                {ungrouped.map((n) => (
                  <div
                    key={n.id}
                    className={`note-item ${n.id === activeId ? "active" : ""}`}
                    onClick={() => setActiveId(n.id)}
                    style={{ cursor: "pointer", marginBottom: 6 }}
                  >
                    {n.title || "Untitled"}
                  </div>
                ))}
              </>
            )}
          </aside>

          {/* Editor */}
          <section>
            {active ? (
              <>
                <input
                  className="input"
                  style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}
                  value={active.title}
                  onChange={(e) => patchActive({ title: e.target.value })}
                  placeholder="Titel"
                />
                <div className="between" style={{ marginBottom: 8 }}>
                  <select
                    className="select"
                    style={{ maxWidth: 220 }}
                    value={active.group_id || ""}
                    onChange={(e) => changeGroup(e.target.value)}
                  >
                    <option value="">Ohne Gruppe</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-sm btn-danger" onClick={() => removeNote(active)}>Löschen</button>
                </div>
                <MarkdownEditor value={active.content} onChange={(v) => patchActive({ content: v })} />
                <p className="small muted" style={{ textAlign: "right" }}>Automatisch gespeichert</p>
              </>
            ) : (
              <div className="empty">Wähle links eine Notiz aus.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
