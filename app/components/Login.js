"use client";

import { useState } from "react";
import { GlassWater } from "lucide-react";
import { useAuth } from "../providers";

/**
 * Email + password authentication screen. Toggles between sign-in and sign-up.
 * Shown by {@link AppFrame} whenever there is no active session.
 */
export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!email || password.length < 6) {
      setMsg({ type: "err", text: "Bitte E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben." });
      return;
    }
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { data, error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) return setMsg({ type: "err", text: error.message });
    if (mode === "signup" && !data.session) {
      setMsg({ type: "ok", text: "Konto erstellt. Bestätige die E-Mail und melde dich dann an." });
      setMode("signin");
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand" style={{ fontSize: 30, marginBottom: 2 }}>
          <GlassWater className="glass" size={32} strokeWidth={2.2} />
          Scotch<span className="dot">.</span>
        </div>
        <p className="muted small" style={{ marginTop: 0, marginBottom: 18 }}>
          Deutsch lernen — Karten, Notizen und ein KI-Korrektor.
        </p>

        {msg && (
          <div className={`banner ${msg.type === "err" ? "banner-err" : "banner-ok"}`} style={{ marginBottom: 14 }}>
            {msg.text}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">E-Mail</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="du@example.com" />
        </div>
        <div className="field">
          <label htmlFor="password">Passwort</label>
          <input id="password" className="input" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Anmelden" : "Konto erstellen"}
        </button>

        <p className="small muted" style={{ textAlign: "center", marginBottom: 0, marginTop: 14 }}>
          {mode === "signin" ? "Noch kein Konto?" : "Schon ein Konto?"}{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); setMsg(null); setMode(mode === "signin" ? "signup" : "signin"); }}>
            {mode === "signin" ? "Registrieren" : "Anmelden"}
          </a>
        </p>
      </form>
    </div>
  );
}
