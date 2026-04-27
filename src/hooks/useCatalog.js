import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "../lib/supabaseClient";

const ITEM_COLUMNS = [
  "id",
  "name",
  "tier",
  "wiki_rarity",
  "collection_name",
  "category",
  "image_url",
  "is_limited",
  "demand_level",
  "source_type",
].join(",");

const COLLECTION_COLUMNS = [
  "id",
  "name",
  "slug",
  "image_url",
  "character",
  "source_type",
  "description",
  "released_at",
  "is_limited",
  "is_active",
  "sort_order",
].join(",");

const CHARACTER_RULES = [
  "Hello Kitty",
  "My Melody",
  "Pompompurin",
  "Kuromi",
  "Cinnamoroll",
  "Pochacco",
  "Keroppi",
  "Badtz-Maru",
  "Tuxedosam",
  "Little Twin Stars",
];

function inferCharacter(item) {
  const haystack = `${item?.name ?? ""} ${item?.collection_name ?? ""}`.toLowerCase();
  return CHARACTER_RULES.find((label) => haystack.includes(label.toLowerCase())) ?? "Sanrio";
}

function mapCatalogItem(item) {
  return {
    ...item,
    rarity: item.tier ?? item.wiki_rarity ?? "C",
    collectionName: item.collection_name ?? "",
    character: inferCharacter(item),
  };
}

function deriveCollectionsFromItems(items) {
  const collectionMap = new Map();

  items.forEach((item, index) => {
    const key = item.collection_name ?? "Unsorted";
    const existing = collectionMap.get(key);

    if (existing) {
      existing.itemCount += 1;
      return;
    }

    collectionMap.set(key, {
      id: `derived-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: key,
      slug: key.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      image_url: item.image_url ?? null,
      character: inferCharacter(item),
      source_type: item.source_type ?? "regular_happy_bag",
      description: "",
      released_at: null,
      is_limited: Boolean(item.is_limited),
      is_active: true,
      sort_order: index + 1,
      itemCount: 1,
    });
  });

  return Array.from(collectionMap.values());
}

export function useCatalog() {
  const [collections, setCollections] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCatalog = useCallback(async () => {
    if (!hasSupabaseClientEnv()) {
      setCollections([]);
      setItems([]);
      setError(
        "Supabase environment variables are incomplete. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const [itemsResult, collectionsResult] = await Promise.all([
        supabase
          .from("items")
          .select(ITEM_COLUMNS)
          .order("tier", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("collections")
          .select(COLLECTION_COLUMNS)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (itemsResult.error) {
        throw itemsResult.error;
      }

      const nextItems = (itemsResult.data ?? []).map(mapCatalogItem);
      const nextCollections =
        collectionsResult.error || !(collectionsResult.data ?? []).length
          ? deriveCollectionsFromItems(nextItems)
          : collectionsResult.data;

      setCollections(nextCollections);
      setItems(nextItems);
      setError("");
    } catch (nextError) {
      setCollections([]);
      setItems([]);
      setError(toSupabaseErrorMessage(nextError, "Failed to load catalog."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const catalog = useMemo(
    () => ({
      collections,
      items,
      loading,
      error,
      refetch: fetchCatalog,
    }),
    [collections, items, loading, error, fetchCatalog]
  );

  return catalog;
}
