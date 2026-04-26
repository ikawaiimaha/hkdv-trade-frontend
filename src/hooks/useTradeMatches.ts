import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Trader, Item } from '../types/supabase';

export interface TradeMatch {
  trader: Trader;
  matchScore: number;
  theyHaveYouWant: MatchedItem[];
  youHaveTheyWant: MatchedItem[];
  possibleTrades: number;
  lastActive: string;
}

export interface MatchedItem {
  item: Item;
  quantity: number;
  rarity: string;
}

interface RawInventory {
  trader_id: string;
  item_id: string;
  quantity_owned: number;
  quantity_available: number;
  is_tradeable_duplicate: boolean;
}

interface RawWishlist {
  trader_id: string;
  item_id: string;
  priority: string;
  desired_quantity: number;
}

export function useTradeMatches(traderId?: string) {
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!traderId) {
      setLoading(false);
      setMatches([]);
      return;
    }

    try {
      setLoading(true);

      // Step 1: Get current user's wishlist item IDs
      const { data: myWishlistDataRaw } = await supabase
        .from('wishlist_entries')
        .select('item_id, desired_quantity')
        .eq('trader_id', traderId);

      const myWishlistData = (myWishlistDataRaw || []) as Array<{ item_id: string; desired_quantity: number }>;
      const myWishlistItemIds = myWishlistData.map((w) => w.item_id);

      // Step 2: Get current user's inventory item IDs (with duplicates)
      const { data: myInventoryDataRaw } = await supabase
        .from('trader_inventory')
        .select('item_id, quantity_available, is_tradeable_duplicate')
        .eq('trader_id', traderId)
        .gt('quantity_available', 0);

      const myInventoryData = (myInventoryDataRaw || []) as Array<{ item_id: string; quantity_available: number; is_tradeable_duplicate: boolean }>;
      const myInventoryItemIds = myInventoryData.map((i) => i.item_id);

      // If user has no wishlist or inventory, no matches possible
      if (myWishlistItemIds.length === 0 || myInventoryItemIds.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Step 3: Find other traders who have items the current user wants
      const { data: theyHaveData } = await supabase
        .from('trader_inventory')
        .select('trader_id, item_id, quantity_owned, quantity_available, is_tradeable_duplicate')
        .in('item_id', myWishlistItemIds)
        .neq('trader_id', traderId)
        .gt('quantity_available', 0);

      // Step 4: Find other traders who want items the current user has
      const { data: theyWantData } = await supabase
        .from('wishlist_entries')
        .select('trader_id, item_id, priority, desired_quantity')
        .in('item_id', myInventoryItemIds)
        .neq('trader_id', traderId);

      // Step 5: Fetch all relevant items in one query
      const allItemIds = [
        ...new Set([
          ...myWishlistItemIds,
          ...myInventoryItemIds,
          ...((theyHaveData || []) as RawInventory[]).map((i) => i.item_id),
          ...((theyWantData || []) as RawWishlist[]).map((w) => w.item_id),
        ]),
      ];

      const { data: itemsDataRaw } = await supabase
        .from('items')
        .select('*')
        .in('id', allItemIds);

      const itemsData = (itemsDataRaw || []) as Item[];
      const itemsMap = new Map(itemsData.map((item) => [item.id, item]));

      // Step 6: Group by trader_id
      const theyHaveMap = new Map<string, RawInventory[]>();
      ((theyHaveData || []) as RawInventory[]).forEach((entry) => {
        if (!theyHaveMap.has(entry.trader_id)) theyHaveMap.set(entry.trader_id, []);
        theyHaveMap.get(entry.trader_id)!.push(entry);
      });

      const theyWantMap = new Map<string, RawWishlist[]>();
      ((theyWantData || []) as RawWishlist[]).forEach((entry) => {
        if (!theyWantMap.has(entry.trader_id)) theyWantMap.set(entry.trader_id, []);
        theyWantMap.get(entry.trader_id)!.push(entry);
      });

      // Find traders who appear in both (mutual interest)
      const mutualTraderIds = [...theyHaveMap.keys()].filter((id) => theyWantMap.has(id));

      if (mutualTraderIds.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Step 7: Fetch trader profiles
      const { data: tradersDataRaw } = await supabase
        .from('traders')
        .select('*')
        .in('id', mutualTraderIds)
        .eq('status', 'active');

      const tradersData = (tradersDataRaw || []) as Trader[];
      const tradersMap = new Map(tradersData.map((t) => [t.id, t]));

      // Step 8: Build match objects
      const computedMatches: TradeMatch[] = mutualTraderIds
        .map((otherTraderId) => {
          const otherTrader = tradersMap.get(otherTraderId);
          if (!otherTrader) return null;

          const theyHave = (theyHaveMap.get(otherTraderId) || [])
            .filter((entry) => myWishlistItemIds.includes(entry.item_id))
            .map((entry) => {
              const item = itemsMap.get(entry.item_id);
              if (!item) return null;
              return {
                item,
                quantity: entry.quantity_available,
                rarity: item.rarity || item.tier || 'N',
              };
            })
            .filter(Boolean) as MatchedItem[];

          const theyWant = (theyWantMap.get(otherTraderId) || [])
            .filter((entry) => myInventoryItemIds.includes(entry.item_id))
            .map((entry) => {
              const item = itemsMap.get(entry.item_id);
              if (!item) return null;
              return {
                item,
                quantity: entry.desired_quantity,
                rarity: item.rarity || item.tier || 'N',
              };
            })
            .filter(Boolean) as MatchedItem[];

          if (theyHave.length === 0 || theyWant.length === 0) return null;

          // Calculate match score
          const rarityWeight: Record<string, number> = { SSR: 4, SR: 3, R: 2, N: 1 };
          const theyHaveScore = theyHave.reduce((sum, m) => sum + (rarityWeight[m.rarity] || 1), 0);
          const theyWantScore = theyWant.reduce((sum, m) => sum + (rarityWeight[m.rarity] || 1), 0);
          const maxScore = Math.max(theyHave.length, theyWant.length) * 4;
          const matchScore = Math.min(100, Math.round(((theyHaveScore + theyWantScore) / (maxScore * 2 || 1)) * 100));

          const possibleTrades = Math.min(theyHave.length, theyWant.length);

          return {
            trader: otherTrader,
            matchScore,
            theyHaveYouWant: theyHave.slice(0, 4),
            youHaveTheyWant: theyWant.slice(0, 4),
            possibleTrades,
            lastActive: otherTrader.updated_at,
          };
        })
        .filter(Boolean) as TradeMatch[];

      // Sort by match score descending
      computedMatches.sort((a, b) => b.matchScore - a.matchScore);

      setMatches(computedMatches.slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trade matches');
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return { matches, loading, error, refetch: fetchMatches };
}
