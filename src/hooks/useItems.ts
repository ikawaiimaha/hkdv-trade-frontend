import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Item } from '../types/supabase';

interface ItemFilters {
  tier?: string;
  collection_id?: string;
  source_type?: string;
  character?: string;
  search?: string;
  is_limited?: boolean;
}

export function useItems(filters?: ItemFilters) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.tier) {
        query = query.eq('tier', filters.tier);
      }
      if (filters?.collection_id) {
        query = query.eq('collection_id', filters.collection_id);
      }
      if (filters?.source_type) {
        query = query.eq('source_type', filters.source_type);
      }
      if (filters?.character) {
        query = query.eq('character', filters.character);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters?.is_limited !== undefined) {
        query = query.eq('is_limited', filters.is_limited);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}
