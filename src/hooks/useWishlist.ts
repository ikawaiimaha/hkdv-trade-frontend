import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WishlistEntry } from '../types/supabase';

export function useWishlist(traderId?: string) {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!traderId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('wishlist_entries')
        .select('*')
        .eq('trader_id', traderId)
        .order('priority', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wishlist');
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  const addToWishlist = useCallback(async (itemId: string, priority: 'low' | 'medium' | 'high' = 'medium', desiredQuantity: number = 1) => {
    if (!traderId) return { error: new Error('Not authenticated') };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('wishlist_entries')
      .insert({
        trader_id: traderId,
        item_id: itemId,
        priority,
        desired_quantity: desiredQuantity,
      });

    if (!error) fetchWishlist();
    return { error };
  }, [traderId, fetchWishlist]);

  const removeFromWishlist = useCallback(async (entryId: string) => {
    const { error } = await supabase.from('wishlist_entries').delete().eq('id', entryId);
    if (!error) fetchWishlist();
    return { error };
  }, [fetchWishlist]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return { entries, loading, error, addToWishlist, removeFromWishlist, refetch: fetchWishlist };
}
