import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Event as SupabaseEvent } from '../types/supabase';

export interface FrontendEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: 'happy-bag' | 'campaign' | 'anniversary';
  status: 'live' | 'soon' | 'ended';
  description?: string;
  imageUrl?: string | null;
  isPublished: boolean;
}

function mapEvent(e: SupabaseEvent): FrontendEvent {
  const now = new Date();
  const start = new Date(e.start_date);
  const end = e.end_date ? new Date(e.end_date) : null;
  
  let status: 'live' | 'soon' | 'ended' = 'soon';
  if (end && now > end) status = 'ended';
  else if (now >= start && (!end || now <= end)) status = 'live';
  else if (now < start) status = 'soon';

  const typeMap: Record<string, 'happy-bag' | 'campaign' | 'anniversary'> = {
    happy_bag: 'happy-bag',
    campaign: 'campaign',
    birthday: 'campaign',
    anniversary: 'anniversary',
    seasonal: 'campaign',
    other: 'campaign',
  };

  return {
    id: e.id,
    title: e.title,
    startDate: e.start_date,
    endDate: e.end_date || e.start_date,
    type: typeMap[e.event_type] || 'campaign',
    status,
    description: e.description || e.collection_name || undefined,
    imageUrl: e.image_url,
    isPublished: e.is_published,
  };
}

export function useEvents() {
  const [events, setEvents] = useState<FrontendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('is_published', true)
          .order('start_date', { ascending: true });

        if (error) throw error;
        setEvents((data || []).map(mapEvent));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return { events, loading, error };
}
