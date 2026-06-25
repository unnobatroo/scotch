"use client";

import { useEffect, useState } from "react";
import { Zap, Bot, Sparkles, User, KeyRound, Check, ClipboardCheck, FileUp } from "lucide-react";
import { useAuth } from "../providers";

/** Provider options for the AI features. */
const PROVIDERS = [
  { value: "groq", label: "Groq (Llama)", Icon: Zap, note: "Gratis & schnell. GROQ_API_KEY." },
  { value: "openrouter", label: "OpenRouter", Icon: Sparkles, note: "Freie Modelle. OPENROUTER_API_KEY." },
  { value: "anthropic", label: "Claude Haiku", Icon: Bot, note: "Beste Qualität. ANTHROPIC_API_KEY." },
];

/** A labelled provider picker bound to one localStorage key. */
function ProviderPicker({ storageKey, value, onSelect }) {
  return (
    <div>
      {PROVIDERS.map(({ value: v, label, Icon, note }) => (
        <label key={v} className="note-item" style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8, padding: 13, border: `1px solid ${value === v ? "var(--accent)" : "var(--border)"}`, borderRadius: 12, cursor: "pointer" }}>
          <input type="radio" name={storageKey} checked={value === v} onChange={() => onSelect(v)} style={{ marginTop: 3 }} />
          <Icon size={19} style={{ color: "var(--accent)" }} />
          <div><strong>{label}</strong><div className="small muted">{note}</div></div>
        </label>
      ))}
    </div>
  );
}

/**
 * Settings — choose the AI provider separately for grading (Prüfen) and for the
 * vocabulary PDF import, since they have different needs. Grading benefits from a
 * stronger model (Claude); import is high-volume and fine on free Groq. API keys
 * live only in server environment variables, never in the browser.
 */
export default function EinstellungenPage() {
  const { user } = useAuth();
  const [grade, setGrade] = useState("groq");
  const [parse, setParse] = useState("groq");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const legacy = localStorage.getItem("scotch.provider");
    setGrade(localStorage.getItem("scotch.provider.grade") || legacy || "groq");
    setParse(localStorage.getItem("scotch.provider.parse") || legacy || "groq");
  }, []);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  function saveGrade(p) { setGrade(p); localStorage.setItem("scotch.provider.grade", p); flash(); }
  function saveParse(p) { setParse(p); localStorage.setItem("scotch.provider.parse", p); flash(); }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="h1">Einstellungen</h1>

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="h2"><User size={17} style={{ verticalAlign: "-3px", marginRight: 6 }} /> Konto</div>
        <p className="small muted" style={{ margin: 0 }}>{user?.email}</p>
      </div>

      {saved && <div className="banner banner-ok" style={{ marginBottom: 14 }}><Check size={15} /> Gespeichert</div>}

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="h2"><ClipboardCheck size={17} style={{ verticalAlign: "-3px", marginRight: 6 }} /> Korrektur (Prüfen)</div>
        <p className="small muted" style={{ marginTop: 0 }}>Empfohlen: <strong>Claude Haiku</strong> — am genauesten bei deutscher Grammatik.</p>
        <ProviderPicker storageKey="grade" value={grade} onSelect={saveGrade} />
      </div>

      <div className="card pad">
        <div className="h2"><FileUp size={17} style={{ verticalAlign: "-3px", marginRight: 6 }} /> Vokabel-Import</div>
        <p className="small muted" style={{ marginTop: 0 }}>Großes Volumen — <strong>Groq</strong> (gratis) ist hier ideal.</p>
        <ProviderPicker storageKey="parse" value={parse} onSelect={saveParse} />
        <p className="small muted" style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 0 }}>
          <KeyRound size={14} style={{ marginTop: 2 }} />
          API-Schlüssel werden nur serverseitig als Umgebungsvariablen in Vercel gespeichert — nie im Browser. Siehe README.
        </p>
      </div>
    </div>
  );
}
