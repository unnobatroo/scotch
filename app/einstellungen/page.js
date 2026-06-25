"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../providers";

/** Provider options for the AI answer-checker. */
const PROVIDERS = [
  { value: "anthropic", label: "Claude Haiku", note: "Günstig & präzise. Braucht ANTHROPIC_API_KEY." },
  { value: "groq", label: "Groq (Llama, gratis)", note: "Kostenloses Kontingent. Braucht GROQ_API_KEY." },
  { value: "openrouter", label: "OpenRouter (Open Models)", note: "Freie Modelle. Braucht OPENROUTER_API_KEY." },
];

/**
 * Settings — choose which AI provider grades exercises. The choice is stored in
 * localStorage and read by the Prüfen page. API keys themselves live only in
 * server environment variables (Vercel), never in the browser.
 */
export default function EinstellungenPage() {
  const { user } = useAuth();
  const [provider, setProvider] = useState("anthropic");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProvider(localStorage.getItem("scotch.provider") || "anthropic");
  }, []);

  function save(p) {
    setProvider(p);
    localStorage.setItem("scotch.provider", p);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <h1 className="h1">Einstellungen</h1>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="h2">Konto</div>
        <p className="small muted" style={{ margin: 0 }}>{user?.email}</p>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="h2">KI-Anbieter für „Prüfen"</div>
        {saved && <div className="banner banner-ok" style={{ marginBottom: 10 }}>Gespeichert</div>}
        {PROVIDERS.map((p) => (
          <label
            key={p.value}
            className="note-item"
            style={{ display: "block", marginBottom: 8, cursor: "pointer", borderColor: provider === p.value ? "var(--accent)" : "var(--border)" }}
          >
            <div className="row">
              <input type="radio" name="provider" checked={provider === p.value} onChange={() => save(p.value)} />
              <div>
                <strong>{p.label}</strong>
                <div className="small muted">{p.note}</div>
              </div>
            </div>
          </label>
        ))}
        <p className="small muted">
          API-Schlüssel werden ausschließlich serverseitig als Umgebungsvariablen in Vercel
          gespeichert — nie im Browser. Siehe README für die Einrichtung.
        </p>
      </div>
    </div>
  );
}
