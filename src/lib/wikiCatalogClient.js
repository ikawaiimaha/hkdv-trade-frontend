import { hasSupabaseRestEnv, requestSupabaseRpc } from "./supabaseRest";

const WIKI_CATALOG_PATH = "/wiki/hkdv-item-catalog.json";

let wikiCatalogCache = null;
let wikiCatalogPromise = null;

function hasSupabaseCatalogEnv() {
  return hasSupabaseRestEnv();
}

async function loadWikiCatalogFromSupabase() {
  return requestSupabaseRpc("get_wiki_item_catalog", {
    p_limit: 15000,
  });
}

async function loadWikiCatalogFromStaticJson() {
  const response = await fetch(WIKI_CATALOG_PATH);

  if (!response.ok) {
    throw new Error(`Wiki catalog request failed with ${response.status}.`);
  }

  return response.json();
}

export async function loadWikiCatalogWithSource() {
  if (wikiCatalogCache) {
    return wikiCatalogCache;
  }

  if (!wikiCatalogPromise) {
    wikiCatalogPromise = (async () => {
      if (hasSupabaseCatalogEnv()) {
        try {
          const rows = await loadWikiCatalogFromSupabase();

          wikiCatalogCache = {
            rows,
            source: "supabase",
          };

          return wikiCatalogCache;
        } catch (error) {
          console.warn("Falling back to generated wiki catalog JSON.", error);
        }
      }

      const rows = await loadWikiCatalogFromStaticJson();

      wikiCatalogCache = {
        rows,
        source: "static",
      };

      return wikiCatalogCache;
    })().catch((error) => {
      wikiCatalogPromise = null;
      throw error;
    });
  }

  return wikiCatalogPromise;
}

export async function loadWikiCatalog() {
  const result = await loadWikiCatalogWithSource();
  return result.rows;
}
