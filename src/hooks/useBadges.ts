import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Badge, Trader } from '../types/supabase';

export interface TraderBadge {
  id: string;
  badgeId: string;
  label: string;
  description: string | null;
  layer: string;
  imageUrl: string | null;
  unlockedAt: string;
  isEquipped: boolean;
}

export interface BadgeProgress {
  badge: Badge;
  isUnlocked: boolean;
  unlockedAt?: string;
  isEquipped?: boolean;
  progress?: number; // 0-100 progress toward unlocking
}

export function useBadges(trader?: Trader | null) {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [myBadges, setMyBadges] = useState<TraderBadge[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all available badges
      const { data: badgesRaw } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const badges = (badgesRaw || []) as Badge[];
      setAllBadges(badges);

      // If trader provided, fetch their badges
      if (trader?.id) {
        const { data: traderBadgesRaw } = await supabase
          .from('trader_badges')
          .select('*')
          .eq('trader_id', trader.id);

        const traderBadges = (traderBadgesRaw || []) as Array<{
          id: string;
          badge_id: string;
          unlocked_at: string;
          is_equipped: boolean;
        }>;

        const enrichedTraderBadges: TraderBadge[] = traderBadges
          .map((tb) => {
            const badge = badges.find((b) => b.id === tb.badge_id);
            if (!badge) return null;
            return {
              id: tb.id,
              badgeId: tb.badge_id,
              label: badge.label,
              description: badge.description,
              layer: badge.layer,
              imageUrl: badge.image_url,
              unlockedAt: tb.unlocked_at,
              isEquipped: tb.is_equipped,
            };
          })
          .filter(Boolean) as TraderBadge[];

        setMyBadges(enrichedTraderBadges);

        // Calculate progress for each badge
        const progress = await calculateProgress(badges, trader, traderBadges);
        setBadgeProgress(progress);
      } else {
        // No trader - show all badges as locked
        setMyBadges([]);
        setBadgeProgress(
          badges.map((b) => ({
            badge: b,
            isUnlocked: false,
            progress: 0,
          }))
        );
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch badges');
    } finally {
      setLoading(false);
    }
  }, [trader?.id]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return {
    allBadges,
    myBadges,
    badgeProgress,
    loading,
    error,
    refetch: fetchBadges,
  };
}

async function calculateProgress(
  badges: Badge[],
  trader: Trader,
  traderBadges: Array<{ badge_id: string; unlocked_at: string; is_equipped: boolean }>
): Promise<BadgeProgress[]> {
  const unlockedBadgeIds = new Set(traderBadges.map((tb) => tb.badge_id));

  // Fetch stats needed for progress calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: inventoryRaw }, { data: wishlistRaw }, { data: tradesRaw }] = await Promise.all([
    supabase.from('trader_inventory').select('id').eq('trader_id', trader.id).gt('quantity_owned', 0),
    supabase.from('wishlist_entries').select('id').eq('trader_id', trader.id),
    supabase.from('trades').select('id').or(`seller_id.eq.${trader.id},buyer_id.eq.${trader.id}`).eq('status', 'completed'),
  ]);

  const inventoryCount = (inventoryRaw || []).length;
  const wishlistCount = (wishlistRaw || []).length;
  const completedTrades = (tradesRaw || []).length;

  return badges.map((badge) => {
    const isUnlocked = unlockedBadgeIds.has(badge.id);

    if (isUnlocked) {
      const tb = traderBadges.find((t) => t.badge_id === badge.id);
      return {
        badge,
        isUnlocked: true,
        unlockedAt: tb?.unlocked_at,
        isEquipped: tb?.is_equipped,
        progress: 100,
      };
    }

    // Calculate progress based on unlock_rule
    const rule = badge.unlock_rule as Record<string, unknown> || {};
    let progress = 0;

    if (rule.type === 'inventory_count') {
      const target = (rule.target as number) || 1;
      progress = Math.min(100, Math.round((inventoryCount / target) * 100));
    } else if (rule.type === 'wishlist_count') {
      const target = (rule.target as number) || 1;
      progress = Math.min(100, Math.round((wishlistCount / target) * 100));
    } else if (rule.type === 'trade_count') {
      const target = (rule.target as number) || 1;
      progress = Math.min(100, Math.round((completedTrades / target) * 100));
    } else if (rule.type === 'collection_complete') {
      progress = 0; // Would need collection-level query
    } else if (rule.type === 'rank_reached') {
      const targetRank = (rule.target as number) || 1;
      progress = Math.min(100, Math.round((trader.strawberry_rank / targetRank) * 100));
    }

    return {
      badge,
      isUnlocked: false,
      progress,
    };
  });
}
