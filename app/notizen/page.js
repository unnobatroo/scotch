"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, FolderPlus, Download, Trash2, NotebookPen, X, ChevronLeft } from "lucide-react";
import { useAuth } from "../providers";
import {
  listGroups, createGroup, deleteGroup,
  listNotes, createNote, updateNote, deleteNote,
} from "@/lib/db";
import { SEED_NOTES } from "@/lib/seedNotes";
import LiveEditor from "../components/LiveEditor";

/** Plain-text preview snippet from Markdown for the note cards. */
function snippet(md) {
  return (md || "")
    .replace(/[#>*_`~\-|]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Notes — a Notion-style board: note groups are columns, notes are cards.
 * Clicking a card opens a full editor with an Obsidian-style live preview.
 * Includes one-click import of the user's Notion grammar notes.
 */
export default function NotizenPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [notes, setNotes] = useState([]);
  const [openId, setOpenId] = useState(null); // note open in the editor
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState(null);
  const saveTimer = useRef(null);

  const open = notes.find((n) => n.id === openId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, n] = await Promise.all([listGroups(), listNotes()]);
      setGroups(g); setNotes(n);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function newNote(groupId = null) {
    const n = await createNote(user.id, { title: "Neue Notiz", content: "", group_id: groupId });
    setNotes((prev) => [n, ...prev]); setOpenId(n.id);
  }
  async function newGroup() {
    const name = prompt("Name der Gruppe?");
    if (!name) return;
    const g = await createGroup(user.id, name.trim());
    setGroups((prev) => [...prev, g]);
  }
  async function removeGroup(g) {
    if (!confirm(`Gruppe „${g.name}" löschen? (Notizen bleiben erhalten)`)) return;
    await deleteGroup(g.id); load();
  }
  async function removeNote(n) {
    if (!confirm("Notiz löschen?")) return;
    await deleteNote(n.id);
    setNotes((prev) => prev.filter((x) => x.id !== n.id));
    setOpenId(null);
  }
  function patchOpen(patch) {
    setNotes((prev) => prev.map((n) => (n.id === openId ? { ...n, ...patch } : n)));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { updateNote(openId, patch).catch((e) => setErr(e.message)); }, 600);
  }
  async function changeGroup(groupId) {
    const g = groupId || null;
    setNotes((prev) => prev.map((n) => (n.id === openId ? { ...n, group_id: g } : n)));
    await updateNote(openId, { group_id: g });
  }

  async function importSeed() {
    if (!confirm(`${SEED_NOTES.length} Notizen aus Notion importieren?`)) return;
    setImporting(true); setErr(null);
    try {
      const byName = {};
      for (const g of groups) byName[g.name] = g.id;
      for (const note of SEED_NOTES) {
        if (!byName[note.group]) {
          const g = await createGroup(user.id, note.group);
          byName[note.group] = g.id;
        }
        await createNote(user.id, { title: note.title, content: note.content, group_id: byName[note.group] });
      }
      await load();
    } catch (e) { setErr("Import fehlgeschlagen: " + e.message); }
    finally { setImporting(false); }
  }

  const notesByGroup = (gid) => notes.filter((n) => n.group_id === gid);
  const ungrouped = notes.filter((n) => !n.group_id);

  /* ----------------------------- Editor view ----------------------------- */
  if (open) {
    return (
      <div>
        <div className="between" style={{ marginBottom: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(null)}><ChevronLeft size={16} /> Notizen</button>
          <button className="btn btn-sm btn-danger" onClick={() => removeNote(open)}><Trash2 size={15} /> Löschen</button>
        </div>
        {err && <div className="banner banner-err" style={{ marginBottom: 12 }}>{err}</div>}
        <div className="card pad">
          <input
            className="input"
            style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, border: "none", padding: "2px 0", marginBottom: 8 }}
            value={open.title}
            onChange={(e) => patchOpen({ title: e.target.value })}
            placeholder="Titel"
          />
          <div className="row" style={{ marginBottom: 14 }}>
            <select className="select" style={{ maxWidth: 260 }} value={open.group_id || ""} onChange={(e) => changeGroup(e.target.value)}>
              <option value="">Ohne Gruppe</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <span className="small muted">Automatisch gespeichert</span>
          </div>
          <LiveEditor key={open.id} value={open.content} onChange={(v) => patchOpen({ content: v })} />
        </div>
      </div>
    );
  }

  /* ----------------------------- Board view ------------------------------ */
  const Column = ({ id, title, items, onAdd, onDelete }) => (
    <div className="board-col">
      <div className="board-col-head">
        <span className="board-col-title">{title} <span className="board-col-count">{items.length}</span></span>
        <span className="row" style={{ gap: 2 }}>
          <button className="btn btn-ghost icon-btn" style={{ padding: 5 }} title="Notiz hinzufügen" onClick={onAdd}><Plus size={15} /></button>
          {onDelete && <button className="btn btn-ghost icon-btn" style={{ padding: 5 }} title="Gruppe löschen" onClick={onDelete}><X size={15} /></button>}
        </span>
      </div>
      {items.map((n) => (
        <div key={n.id} className="note-card" onClick={() => setOpenId(n.id)}>
          <div className="nc-title">{n.title || "Untitled"}</div>
          {snippet(n.content) && <div className="nc-prev">{snippet(n.content)}</div>}
        </div>
      ))}
      <button className="col-add" onClick={onAdd}><Plus size={15} /> Notiz</button>
    </div>
  );

  return (
    <div>
      <div className="between">
        <h1 className="h1">Notizen</h1>
        <div className="row">
          <button className="btn btn-sm" onClick={newGroup}><FolderPlus size={16} /> Gruppe</button>
          <button className="btn btn-primary btn-sm" onClick={() => newNote()}><Plus size={16} /> Notiz</button>
        </div>
      </div>
      {err && <div className="banner banner-err">{err}</div>}

      {loading ? (
        <div className="empty"><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : notes.length === 0 && groups.length === 0 ? (
        <div className="empty">
          <NotebookPen className="empty-ico" size={40} />
          <p>Noch keine Notizen.</p>
          <button className="btn btn-primary" onClick={importSeed} disabled={importing}>
            <Download size={16} /> {importing ? "Importiert…" : "Aus Notion importieren"}
          </button>
        </div>
      ) : (
        <div className="board-wrap">
          <div className="board">
            {groups.map((g) => (
              <Column
                key={g.id}
                id={g.id}
                title={g.name}
                items={notesByGroup(g.id)}
                onAdd={() => newNote(g.id)}
                onDelete={() => removeGroup(g)}
              />
            ))}
            {ungrouped.length > 0 && (
              <Column id={null} title="Ohne Gruppe" items={ungrouped} onAdd={() => newNote(null)} />
            )}
            <button className="btn add-col" onClick={newGroup}><FolderPlus size={16} /> Gruppe</button>
          </div>
        </div>
      )}
    </div>
  );
}
