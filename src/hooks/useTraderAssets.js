import { useCallback, useEffect, useState } from "react";
import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "../lib/supabaseClient";

function normalizeRarity(item) {
  return item?.tier ?? item?.wiki_rarity ?? item?.rarity ?? "C";
}

export function useTraderAssets(traderId) {
  const [inventory, setInventory] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAssets = useCallback(async () => {
    if (!traderId || !hasSupabaseClientEnv()) {
      setInventory([]);
      setWishlist([]);
      setLoading(false);
      setError("");
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const [{ data: inventoryRows, error: inventoryError }, { data: wishlistRows, error: wishlistError }] =
        await Promise.all([
          supabase
            .from("trader_inventory")
            .select("*,items:item_id(id,name,tier,wiki_rarity,image_url,character,collection_name)")
            .eq("trader_id", traderId)
            .gt("quantity_available", 0)
            .order("created_at", { ascending: false }),
          supabase
            .from("wishlist_entries")
            .select("id,item_id,priority,desired_quantity,items:item_id(id,name,tier,wiki_rarity,image_url,character,collection_name)")
            .eq("trader_id", traderId)
            .order("created_at", { ascending: false }),
        ]);

      if (inventoryError) {
        throw inventoryError;
      }

      if (wishlistError) {
        throw wishlistError;
      }

      setInventory(
        (inventoryRows ?? []).map((row) => ({
          id: row.id,
          type: "inventory",
          itemId: row.item_id,
          quantity: row.quantity_owned ?? row.quantity_total ?? row.quantity_available ?? 0,
          available: row.quantity_available ?? 0,
          isTradeable: Boolean(row.is_tradeable_duplicate),
          name: row.items?.name ?? "Unknown",
          rarity: normalizeRarity(row.items),
          imageUrl: row.items?.image_url ?? null,
          character: row.items?.character ?? "",
          collectionName: row.items?.collection_name ?? "",
        }))
      );

      setWishlist(
        (wishlistRows ?? []).map((row) => ({
          id: row.id,
          type: "wishlist",
          itemId: row.item_id,
          priority: row.priority,
          desiredQuantity: row.desired_quantity ?? 1,
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
      setWishlist([]);
      setError(toSupabaseErrorMessage(nextError, "Failed to load assets."));
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return { inventory, wishlist, loading, error, refetch: fetchAssets };
}
