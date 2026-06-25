"use client";

import { useState } from "react";
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
  const [msg, setMsg] = useState(null); // { type: 'err'|'ok', text }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!email || password.length < 6) {
      setMsg({ type: "err", text: "Enter an email and a password of at least 6 characters." });
      return;
    }
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { data, error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }
    if (mode === "signup" && !data.session) {
      setMsg({ type: "ok", text: "Account created. Check your email to confirm, then sign in." });
      setMode("signin");
    }
    // On success with a session, AuthProvider updates and the app renders.
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand" style={{ fontSize: 26, marginBottom: 4 }}>
          Scotch<span>.</span>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          Deutsch lernen — Karten, Notizen & ein KI-Korrektor.
        </p>

        {msg && (
          <div className={`banner ${msg.type === "err" ? "banner-err" : "banner-ok"}`} style={{ marginBottom: 12 }}>
            {msg.text}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">E-Mail</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@example.com"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Passwort</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Anmelden" : "Konto erstellen"}
        </button>

        <p className="small muted" style={{ textAlign: "center", marginBottom: 0 }}>
          {mode === "signin" ? "Noch kein Konto?" : "Schon ein Konto?"}{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMsg(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin" ? "Registrieren" : "Anmelden"}
          </a>
        </p>
      </form>
    </div>
  );
}
