import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types/supabase';

export interface EnrichedNotification extends Notification {
  itemName?: string;
  otherTraderName?: string;
}

export function useNotifications(traderId?: string) {
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!traderId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch notifications with related data
      const { data: notifsRaw } = await supabase
        .from('notifications')
        .select('*')
        .eq('trader_id', traderId)
        .order('created_at', { ascending: false })
        .limit(50);

      const notifs = (notifsRaw || []) as Notification[];

      // Get unread count
      const unread = notifs.filter((n) => !n.is_read).length;
      setUnreadCount(unread);

      // Enrich with item names and trader names if available
      const itemIds = notifs.map((n) => n.item_id).filter(Boolean) as string[];
      const otherTraderIds = notifs
        .map((n) => n.seller_trader_id)
        .filter(Boolean) as string[];

      let itemNames = new Map<string, string>();
      let traderNames = new Map<string, string>();

      if (itemIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('items')
          .select('id, name')
          .in('id', [...new Set(itemIds)]);

        itemNames = new Map((itemsData || []).map((item: Record<string, unknown>) => [item.id as string, item.name as string]));
      }

      if (otherTraderIds.length > 0) {
        const { data: tradersData } = await supabase
          .from('traders')
          .select('id, display_name')
          .in('id', [...new Set(otherTraderIds)]);

        traderNames = new Map((tradersData || []).map((t: Record<string, unknown>) => [t.id as string, t.display_name as string]));
      }

      const enriched: EnrichedNotification[] = notifs.map((n) => ({
        ...n,
        itemName: n.item_id ? itemNames.get(n.item_id) || undefined : undefined,
        otherTraderName: n.seller_trader_id ? traderNames.get(n.seller_trader_id) || undefined : undefined,
      }));

      setNotifications(enriched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!traderId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('trader_id', traderId)
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, [traderId]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!traderId) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `trader_id=eq.${traderId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [traderId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
