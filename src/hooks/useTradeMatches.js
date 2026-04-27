import { useCallback, useEffect, useState } from "react";
import {
  getSupabaseClient,
  hasSupabaseClientEnv,
  toSupabaseErrorMessage,
} from "../lib/supabaseClient";

const RARITY_WEIGHT = { SSR: 4, SR: 3, R: 2, C: 1, N: 1 };

function mapItem(item) {
  return {
    id: item.id,
    name: item.name,
    rarity: item.tier ?? item.wiki_rarity ?? "C",
    imageUrl: item.image_url ?? null,
    collectionName: item.collection_name ?? "",
  };
}

function scoreItems(items) {
  return items.reduce((total, item) => total + (RARITY_WEIGHT[item.rarity] ?? 1), 0);
}

export function useTradeMatches(traderId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const findMatches = useCallback(async () => {
    if (!traderId || !hasSupabaseClientEnv()) {
      setMatches([]);
      setLoading(false);
      setError("");
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const [{ data: myWishlist, error: wishlistError }, { data: myInventory, error: inventoryError }] =
        await Promise.all([
          supabase.from("wishlist_entries").select("item_id,priority").eq("trader_id", traderId),
          supabase
            .from("trader_inventory")
            .select("item_id,quantity_available,is_tradeable_duplicate")
            .eq("trader_id", traderId)
            .gt("quantity_available", 0),
        ]);

      if (wishlistError) {
        throw wishlistError;
      }

      if (inventoryError) {
        throw inventoryError;
      }

      const myWishIds = (myWishlist ?? []).map((row) => row.item_id);
      const myInventoryIds = (myInventory ?? [])
        .filter((row) => row.quantity_available > 0)
        .map((row) => row.item_id);

      if (!myWishIds.length || !myInventoryIds.length) {
        setMatches([]);
        setError("");
        return;
      }

      const [{ data: theyHave, error: theyHaveError }, { data: theyWant, error: theyWantError }] =
        await Promise.all([
          supabase
            .from("trader_inventory")
            .select("trader_id,item_id,quantity_available")
            .in("item_id", myWishIds)
            .neq("trader_id", traderId)
            .gt("quantity_available", 0),
          supabase
            .from("wishlist_entries")
            .select("trader_id,item_id,priority")
            .in("item_id", myInventoryIds)
            .neq("trader_id", traderId),
        ]);

      if (theyHaveError) {
        throw theyHaveError;
      }

      if (theyWantError) {
        throw theyWantError;
      }

      const mutualTraderIds = [...new Set((theyHave ?? []).map((row) => row.trader_id))].filter((id) =>
        (theyWant ?? []).some((row) => row.trader_id === id)
      );

      if (!mutualTraderIds.length) {
        setMatches([]);
        setError("");
        return;
      }

      const allItemIds = [
        ...new Set([
          ...myWishIds,
          ...myInventoryIds,
          ...(theyHave ?? []).map((row) => row.item_id),
          ...(theyWant ?? []).map((row) => row.item_id),
        ]),
      ];

      const [{ data: traders, error: tradersError }, { data: items, error: itemsError }] =
        await Promise.all([
          supabase
            .from("traders")
            .select("id,username,display_name,avatar_url,buddy_key,strawberry_title,status")
            .in("id", mutualTraderIds)
            .eq("status", "active"),
          supabase
            .from("items")
            .select("id,name,tier,wiki_rarity,image_url,collection_name")
            .in("id", allItemIds),
        ]);

      if (tradersError) {
        throw tradersError;
      }

      if (itemsError) {
        throw itemsError;
      }

      const itemMap = new Map((items ?? []).map((item) => [item.id, mapItem(item)]));

      const nextMatches = (traders ?? [])
        .map((trader) => {
          const theyHaveYouWant = (theyHave ?? [])
            .filter((row) => row.trader_id === trader.id)
            .map((row) => itemMap.get(row.item_id))
            .filter(Boolean);

          const youHaveTheyWant = (theyWant ?? [])
            .filter((row) => row.trader_id === trader.id)
            .map((row) => itemMap.get(row.item_id))
            .filter(Boolean);

          if (!theyHaveYouWant.length || !youHaveTheyWant.length) {
            return null;
          }

          const totalWeight = scoreItems(theyHaveYouWant) + scoreItems(youHaveTheyWant);
          const maxWeight = (theyHaveYouWant.length + youHaveTheyWant.length) * 4;
          const matchScore = Math.max(1, Math.min(100, Math.round((totalWeight / Math.max(maxWeight, 1)) * 100)));

          return {
            otherTrader: {
              id: trader.id,
              username: trader.username,
              displayName: trader.display_name,
              avatarUrl: trader.avatar_url ?? null,
              buddyKey: trader.buddy_key ?? null,
              strawberryTitle: trader.strawberry_title ?? "",
            },
            theyHaveYouWant,
            youHaveTheyWant,
            matchScore,
            possibleTrades: Math.min(theyHaveYouWant.length, youHaveTheyWant.length),
          };
        })
        .filter(Boolean)
        .sort((left, right) => right.matchScore - left.matchScore);

      setMatches(nextMatches);
      setError("");
    } catch (nextError) {
      setMatches([]);
      setError(toSupabaseErrorMessage(nextError, "Failed to find trade matches."));
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  useEffect(() => {
    findMatches();
  }, [findMatches]);

  return { matches, loading, error, refetch: findMatches };
}
