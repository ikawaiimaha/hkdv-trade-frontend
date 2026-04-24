import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "./supabaseClient";

export function hasSupabaseRestEnv() {
  return hasSupabaseClientEnv();
}

export async function requestSupabaseRpc(functionName, payload = {}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc(functionName, payload);

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, `Supabase RPC ${functionName} failed.`));
  }

  return data;
}
