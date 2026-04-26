import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Item, InventoryItem, WishlistEntry } from '../types/supabase';

export interface ProfileInventoryItem {
  inventoryId: string;
  item: Item;
  quantityOwned: number;
  quantityAvailable: number;
  isTradeable: boolean;
}

export interface ProfileWishlistItem {
  entryId: string;
  item: Item;
  priority: string;
  desiredQuantity: number;
}

export interface ConversionMetrics {
  wishlistFulfillmentRate: number; // % of wishlist items obtained
  tradeAcceptanceRate: number; // % of offers accepted
  totalOffersSent: number;
  totalOffersReceived: number;
  acceptedOffers: number;
  rejectedOffers: number;
  collectionCompletionRate: number; // avg % across all collections
}

export interface ProfileStats {
  inventory: ProfileInventoryItem[];
  wishlist: ProfileWishlistItem[];
  metrics: ConversionMetrics;
  loading: boolean;
  error: string | null;
}

export function useProfileStats(traderId?: string): ProfileStats {
  const [inventory, setInventory] = useState<ProfileInventoryItem[]>([]);
  const [wishlist, setWishlist] = useState<ProfileWishlistItem[]>([]);
  const [metrics, setMetrics] = useState<ConversionMetrics>({
    wishlistFulfillmentRate: 0,
    tradeAcceptanceRate: 0,
    totalOffersSent: 0,
    totalOffersReceived: 0,
    acceptedOffers: 0,
    rejectedOffers: 0,
    collectionCompletionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!traderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch inventory with item details
      const { data: inventoryDataRaw } = await supabase
        .from('trader_inventory')
        .select('*')
        .eq('trader_id', traderId)
        .gt('quantity_owned', 0)
        .order('created_at', { ascending: false });

      const inventoryData = (inventoryDataRaw || []) as InventoryItem[];
      const inventoryItemIds = inventoryData.map((i) => i.item_id);

      // Fetch wishlist with item details
      const { data: wishlistDataRaw } = await supabase
        .from('wishlist_entries')
        .select('*')
        .eq('trader_id', traderId)
        .order('priority', { ascending: false });

      const wishlistData = (wishlistDataRaw || []) as WishlistEntry[];
      const wishlistItemIds = wishlistData.map((w) => w.item_id);

      // Fetch all related items in one query
      const allItemIds = [...new Set([...inventoryItemIds, ...wishlistItemIds])];
      let itemsMap = new Map<string, Item>();

      if (allItemIds.length > 0) {
        const { data: itemsDataRaw } = await supabase
          .from('items')
          .select('*')
          .in('id', allItemIds);

        const itemsData = (itemsDataRaw || []) as Item[];
        itemsMap = new Map(itemsData.map((item) => [item.id, item]));
      }

      // Build enriched inventory
      const enrichedInventory: ProfileInventoryItem[] = inventoryData
        .map((inv) => {
          const item = itemsMap.get(inv.item_id);
          if (!item) return null;
          return {
            inventoryId: inv.id,
            item,
            quantityOwned: inv.quantity_owned,
            quantityAvailable: inv.quantity_available,
            isTradeable: inv.is_tradeable_duplicate && inv.quantity_available > 0,
          };
        })
        .filter(Boolean) as ProfileInventoryItem[];

      // Build enriched wishlist
      const enrichedWishlist: ProfileWishlistItem[] = wishlistData
        .map((entry) => {
          const item = itemsMap.get(entry.item_id);
          if (!item) return null;
          return {
            entryId: entry.id,
            item,
            priority: entry.priority,
            desiredQuantity: entry.desired_quantity,
          };
        })
        .filter(Boolean) as ProfileWishlistItem[];

      setInventory(enrichedInventory);
      setWishlist(enrichedWishlist);

      // Calculate conversion metrics
      // 1. Wishlist fulfillment rate = how many wishlisted items are now in inventory
      const wishlistItemIdSet = new Set(wishlistItemIds);
      const ownedItemIdSet = new Set(inventoryItemIds);
      const fulfilledWishlistItems = [...wishlistItemIdSet].filter((id) => ownedItemIdSet.has(id)).length;
      const wishlistFulfillmentRate = wishlistItemIds.length > 0
        ? Math.round((fulfilledWishlistItems / wishlistItemIds.length) * 100)
        : 0;

      // 2. Fetch offers data
      const { data: offersSentRaw } = await supabase
        .from('offers')
        .select('status')
        .eq('buyer_id', traderId);

      const { data: offersReceivedRaw } = await supabase
        .from('offers')
        .select('status')
        .eq('seller_id', traderId);

      const offersSent = (offersSentRaw || []) as Array<{ status: string }>;
      const offersReceived = (offersReceivedRaw || []) as Array<{ status: string }>;

      const totalOffersSent = offersSent.length;
      const totalOffersReceived = offersReceived.length;
      const acceptedOffers = offersSent.filter((o) => o.status === 'accepted').length +
        offersReceived.filter((o) => o.status === 'accepted').length;
      const rejectedOffers = offersSent.filter((o) => o.status === 'rejected').length +
        offersReceived.filter((o) => o.status === 'rejected').length;

      const allOffers = [...offersSent, ...offersReceived];
      const tradeAcceptanceRate = allOffers.length > 0
        ? Math.round((acceptedOffers / allOffers.length) * 100)
        : 0;

      // 3. Collection completion rate
      const { data: collectionsRaw } = await supabase
        .from('collections')
        .select('id');

      const collections = (collectionsRaw || []) as Array<{ id: string }>;
      let totalCompletion = 0;

      if (collections.length > 0) {
        for (const collection of collections.slice(0, 10)) { // Limit to avoid too many queries
          const { data: collectionItemsRaw } = await supabase
            .from('items')
            .select('id')
            .eq('collection_id', collection.id);

          const collectionItems = (collectionItemsRaw || []) as Array<{ id: string }>;
          const collectionItemIds = new Set(collectionItems.map((i) => i.id));
          const ownedInCollection = [...collectionItemIds].filter((id) => ownedItemIdSet.has(id)).length;
          const collectionCompletion = collectionItems.length > 0
            ? (ownedInCollection / collectionItems.length) * 100
            : 0;
          totalCompletion += collectionCompletion;
        }
      }

      const collectionCompletionRate = collections.length > 0
        ? Math.round(totalCompletion / collections.length)
        : 0;

      setMetrics({
        wishlistFulfillmentRate,
        tradeAcceptanceRate,
        totalOffersSent,
        totalOffersReceived,
        acceptedOffers,
        rejectedOffers,
        collectionCompletionRate,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile stats');
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { inventory, wishlist, metrics, loading, error };
}
