import { useCallback, useEffect, useState } from "react";
import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "../lib/supabaseClient";

function normalizeRarity(item) {
  return item?.tier ?? item?.wiki_rarity ?? item?.rarity ?? "C";
}

export function useTraderInventory(traderId) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInventory = useCallback(async () => {
    if (!traderId || !hasSupabaseClientEnv()) {
      setInventory([]);
      setLoading(false);
      setError("");
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const { data, error: queryError } = await supabase
        .from("trader_inventory")
        .select("*,items:item_id(id,name,tier,wiki_rarity,image_url,character,collection_name)")
        .eq("trader_id", traderId)
        .gt("quantity_available", 0)
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setInventory(
        (data ?? []).map((row) => ({
          inventoryId: row.id,
          itemId: row.item_id,
          quantityTotal: row.quantity_owned ?? row.quantity_total ?? row.quantity_available ?? 0,
          quantityAvailable: row.quantity_available ?? 0,
          isTradeable: Boolean(row.is_tradeable_duplicate),
          name: row.items?.name ?? "Unknown",
          rarity: normalizeRarity(row.items),
          imageUrl: row.items?.image_url ?? null,
          character: row.items?.character ?? "",
          collectionName: row.items?.collection_name ?? "",
        }))
      );

      setError("");
    } catch (nextError) {
      setInventory([]);
      setError(toSupabaseErrorMessage(nextError, "Failed to load inventory."));
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { inventory, loading, error, refetch: fetchInventory };
}
