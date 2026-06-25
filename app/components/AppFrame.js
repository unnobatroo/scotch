"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../providers";
import Login from "./Login";

/** Bottom-navigation destinations. */
const NAV = [
  { href: "/karten", label: "Karten", icon: "🗂️" },
  { href: "/lernen", label: "Lernen", icon: "🎯" },
  { href: "/notizen", label: "Notizen", icon: "📝" },
  { href: "/pruefen", label: "Prüfen", icon: "✅" },
];

/**
 * Persistent application shell. Gates content behind authentication and renders
 * the sticky top bar plus the mobile-first bottom navigation.
 * @param {{children: React.ReactNode}} props
 */
export default function AppFrame({ children }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname() || "/";

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <>
      <header className="topbar">
        <div className="brand">
          Scotch<span>.</span>
        </div>
        <div className="row">
          <Link href="/einstellungen" className="btn btn-ghost btn-sm" aria-label="Einstellungen">
            ⚙︎
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
            Abmelden
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <nav className="bottomnav">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""}>
              <span className="ico">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
