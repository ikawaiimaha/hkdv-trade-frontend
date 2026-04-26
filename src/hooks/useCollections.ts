import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Collection as SupabaseCollection } from '../types/supabase';

export interface FrontendCollection {
  id: string;
  title: string;
  date: string;
  itemCount: number;
  type: 'limited' | 'new';
  description: string;
  image: string;
  isLimited: boolean;
  character: string | null;
  releasedAt: string;
}

function mapCollection(c: SupabaseCollection): FrontendCollection {
  return {
    id: c.id,
    title: c.name,
    date: new Date(c.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    itemCount: 0, // Will be populated from collection_items count if needed
    type: c.is_limited ? 'limited' : 'new',
    description: c.description || `${c.name} collection featuring ${c.character || 'Sanrio'} themed items.`,
    image: c.image_url || '/collection-sunshine.jpg',
    isLimited: c.is_limited,
    character: c.character,
    releasedAt: c.released_at,
  };
}

export function useCollections() {
  const [collections, setCollections] = useState<FrontendCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('released_at', { ascending: false });

        if (error) throw error;
        setCollections((data || []).map(mapCollection));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch collections');
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, []);

  return { collections, loading, error };
}
