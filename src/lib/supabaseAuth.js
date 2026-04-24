import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "./supabaseClient";

export function hasSupabaseAuthEnv() {
  return hasSupabaseClientEnv();
}

export async function getInitialAuthState() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, "Unable to restore the Supabase session."));
  }

  return {
    session,
    user: session?.user ?? null,
  };
}

export function subscribeToAuthChanges(callback) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

export async function signInWithPassword({ email, password }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, "Unable to sign in."));
  }

  return data;
}

export async function signUpWithPassword({ email, password }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, "Unable to sign up."));
  }

  return data;
}

export async function signOutSupabase() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, "Unable to sign out."));
  }
}
