import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "./supabaseClient";

const ITEM_PREVIEW_LIMIT = 24;

let itemsCatalogCache = null;
let itemsCatalogPromise = null;

async function loadItemsCatalogFromSupabase() {
  const supabase = getSupabaseClient();
  const { data, error, count } = await supabase
    .from("items")
    .select("id,name,wiki_rarity,collection_name", { count: "exact" })
    .order("name", { ascending: true })
    .limit(ITEM_PREVIEW_LIMIT);

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, "Oops! Momo couldn't find the items."));
  }

  return {
    rows: data ?? [],
    totalCount: count ?? data?.length ?? 0,
    source: "supabase",
  };
}

export async function loadItemsCatalogWithSource() {
  if (itemsCatalogCache) {
    return itemsCatalogCache;
  }

  if (!itemsCatalogPromise) {
    itemsCatalogPromise = (async () => {
      if (!hasSupabaseClientEnv()) {
        itemsCatalogCache = {
          rows: [],
          totalCount: 0,
          source: "unconfigured",
        };

        return itemsCatalogCache;
      }

      itemsCatalogCache = await loadItemsCatalogFromSupabase();
      return itemsCatalogCache;
    })().catch((error) => {
      itemsCatalogPromise = null;
      throw error;
    });
  }

  return itemsCatalogPromise;
}
