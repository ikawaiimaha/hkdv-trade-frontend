import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface HKDVAccount {
  id: string;
  traderId: string;
  hkdvPlayerId: string;
  hkdvDisplayName: string;
  proofImageUrl: string | null;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface PendingApplication {
  accountId: string;
  traderId: string;
  traderName: string;
  traderUsername: string;
  traderAvatar: string | null;
  hkdvPlayerId: string;
  hkdvDisplayName: string;
  proofImageUrl: string | null;
  createdAt: string;
  invitationCode: string | null;
}

export function useHKDVVerification(traderId?: string) {
  const [hkdvAccount, setHkdvAccount] = useState<HKDVAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!traderId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hkdv_player_accounts')
        .select('*')
        .eq('trader_id', traderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        const d = data as Record<string, unknown>;
        setHkdvAccount({
          id: d.id as string,
          traderId: d.trader_id as string,
          hkdvPlayerId: d.hkdv_player_id as string,
          hkdvDisplayName: d.hkdv_display_name as string,
          proofImageUrl: d.proof_image_url as string | null,
          verificationStatus: d.verification_status as 'pending' | 'approved' | 'rejected',
          verifiedBy: d.verified_by as string | null,
          verifiedAt: d.verified_at as string | null,
          createdAt: d.created_at as string,
        });
      } else {
        setHkdvAccount(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch HKDV account');
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  return { hkdvAccount, loading, error, refetch: fetchAccount };
}

export function usePendingApplications(isAdmin: boolean) {
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Fetch all pending HKDV accounts with trader info
      const { data: accountsRaw, error: accError } = await supabase
        .from('hkdv_player_accounts')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });

      if (accError) throw accError;
      const accounts = (accountsRaw || []) as Array<Record<string, unknown>>;

      if (accounts.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Fetch trader details
      const traderIds = accounts.map((a) => a.trader_id as string);
      const { data: tradersRaw } = await supabase
        .from('traders')
        .select('id, display_name, username, avatar_url')
        .in('id', traderIds);

      const tradersMap = new Map(
        (tradersRaw || []).map((t: Record<string, unknown>) => [t.id as string, t])
      );

      // Fetch invitation codes used
      const { data: invitesRaw } = await supabase
        .from('invitation_codes')
        .select('used_by, code')
        .in('used_by', traderIds);

      const inviteMap = new Map(
        (invitesRaw || []).map((i: Record<string, unknown>) => [i.used_by as string, i.code as string])
      );

      const enriched: PendingApplication[] = accounts.map((acc) => {
        const t = tradersMap.get(acc.trader_id as string) as Record<string, unknown> | undefined;
        return {
          accountId: acc.id as string,
          traderId: acc.trader_id as string,
          traderName: (t?.display_name as string) || 'Unknown',
          traderUsername: (t?.username as string) || '',
          traderAvatar: (t?.avatar_url as string) || null,
          hkdvPlayerId: acc.hkdv_player_id as string,
          hkdvDisplayName: acc.hkdv_display_name as string,
          proofImageUrl: (acc.proof_image_url as string) || null,
          createdAt: acc.created_at as string,
          invitationCode: inviteMap.get(acc.trader_id as string) || null,
        };
      });

      setApplications(enriched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return { applications, loading, error, refetch: fetchApplications };
}

export function useInvitationCodes(isAdmin: boolean) {
  const [codes, setCodes] = useState<Array<{ code: string; useCount: number; maxUses: number; isActive: boolean; usedBy: string | null; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('code, use_count, max_uses, is_active, used_by, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes((data || []).map((c: Record<string, unknown>) => ({
        code: c.code as string,
        useCount: c.use_count as number,
        maxUses: c.max_uses as number,
        isActive: c.is_active as boolean,
        usedBy: c.used_by as string | null,
        createdAt: c.created_at as string,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch codes');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const generateCode = useCallback(async () => {
    if (!isAdmin) return { code: null, error: new Error('Admin only') };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('generate_invitation_code', {
        p_max_uses: 1,
        p_expires_at: null,
      });
      if (error) throw error;
      await fetchCodes();
      return { code: data as string, error: null };
    } catch (err) {
      return { code: null, error: err instanceof Error ? err : new Error('Failed to generate') };
    }
  }, [isAdmin, fetchCodes]);

  return { codes, loading, error, fetchCodes, generateCode };
}
