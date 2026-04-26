import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Trader, ReputationSnapshot } from '../types/supabase';

export function useTrader(traderId?: string) {
  const [trader, setTrader] = useState<Trader | null>(null);
  const [reputation, setReputation] = useState<ReputationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrader() {
      if (!traderId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('traders')
          .select('*')
          .eq('id', traderId)
          .single();

        if (error) throw error;
        setTrader(data);

        // Fetch reputation
        const { data: repData } = await supabase
          .from('reputation_snapshots')
          .select('*')
          .eq('trader_id', traderId)
          .single();

        setReputation(repData || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trader');
      } finally {
        setLoading(false);
      }
    }

    fetchTrader();
  }, [traderId]);

  return { trader, reputation, loading, error };
}
