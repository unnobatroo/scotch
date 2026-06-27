"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlassWater, Layers, GraduationCap, CircleCheckBig, Settings, LogOut } from "lucide-react";
import { useAuth } from "../providers";
import Login from "./Login";

/** Primary navigation destinations (shared by sidebar and bottom nav). */
const NAV = [
  { href: "/karten", label: "Karten", Icon: Layers },
  { href: "/lernen", label: "Lernen", Icon: GraduationCap },
  { href: "/pruefen", label: "Prüfen", Icon: CircleCheckBig },
];

function Brand({ size = 20 }) {
  return (
    <span className="brand" style={{ fontSize: size }}>
      <GlassWater className="glass" size={size + 2} strokeWidth={2.2} />
      Scotch<span className="dot">.</span>
    </span>
  );
}

/**
 * Persistent application shell. Gates content behind authentication, then renders
 * a left sidebar on desktop and a sticky top bar + bottom nav on mobile.
 */
export default function AppFrame({ children }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname() || "/";
  const isActive = (href) => pathname.startsWith(href);

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <div className="shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <Brand size={24} />
        {NAV.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={`sidebar-link ${isActive(href) ? "active" : ""}`}>
            <Icon size={20} strokeWidth={2.1} />
            {label}
          </Link>
        ))}
        <div className="sidebar-foot">
          <Link href="/einstellungen" className={`sidebar-link ${isActive("/einstellungen") ? "active" : ""}`}>
            <Settings size={20} strokeWidth={2.1} />
            Einstellungen
          </Link>
          <button className="sidebar-link" style={{ background: "none", border: "none", width: "100%", textAlign: "left" }} onClick={() => signOut()}>
            <LogOut size={20} strokeWidth={2.1} />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="main">
        <header className="topbar mobile-only">
          <Brand size={20} />
          <div className="row">
            <Link href="/einstellungen" className="btn btn-ghost icon-btn" aria-label="Einstellungen">
              <Settings size={20} />
            </Link>
            <button className="btn btn-ghost icon-btn" onClick={() => signOut()} aria-label="Abmelden">
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottomnav mobile-only">
        {NAV.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={isActive(href) ? "active" : ""}>
            <Icon size={21} strokeWidth={2.1} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
