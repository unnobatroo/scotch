"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Authentication context. Exposes the current Supabase user/session and helpers
 * for signing in, signing up, and signing out with email + password.
 * @type {React.Context<any>}
 */
const AuthContext = createContext(null);

/**
 * Provider that subscribes to Supabase auth state and makes it available app-wide.
 * Wrap the app root with this in the layout.
 * @param {{children: React.ReactNode}} props
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    (email, password) => supabase.auth.signInWithPassword({ email, password }),
    []
  );
  const signUp = useCallback(
    (email, password) => supabase.auth.signUp({ email, password }),
    []
  );
  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const value = { session, user: session?.user ?? null, loading, signIn, signUp, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to read the auth context.
 * @returns {{session: any, user: any, loading: boolean, signIn: Function, signUp: Function, signOut: Function}}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
