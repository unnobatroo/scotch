"use client";
import { createClient } from "@supabase/supabase-js";

// Publishable (anon) values are safe to expose in the browser — RLS protects data.
// Env vars override these if set in Vercel.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://deotpmaxtqdafqdhetjm.supabase.co";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_wOk4yp6K4IwovUVLLHjJ9A_DU3_ORYA";

let _client;
export function getSupabase() {
  if (!_client) {
    _client = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _client;
}

export const supabase = getSupabase();
