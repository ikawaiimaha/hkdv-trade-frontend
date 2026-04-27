import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim() ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

let supabaseClient = null;

function getSupabaseHostLabel() {
  if (!supabaseUrl) {
    return "your configured Supabase project";
  }

  try {
    return new URL(supabaseUrl).host;
  } catch {
    return "your configured Supabase project";
  }
}

export function hasSupabaseClientEnv() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function toSupabaseErrorMessage(error, fallbackMessage) {
  const rawMessage = error?.message?.trim() ?? "";

  if (/failed to fetch|fetch failed|networkerror|load failed/i.test(rawMessage)) {
    return `Unable to reach Supabase at ${getSupabaseHostLabel()}. Check your internet connection, proxy or VPN, firewall, and whether the .env project URL/key are current.`;
  }

  return rawMessage || fallbackMessage;
}

export function getSupabaseClient() {
  if (!hasSupabaseClientEnv()) {
    throw new Error(
      "Supabase environment variables are incomplete. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)."
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
}
