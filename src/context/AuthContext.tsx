import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Trader } from '../types/supabase';

interface AuthContextValue {
  trader: Trader | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (username: string, passcode: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  signup: (data: SignupData) => Promise<{ error: string | null }>;
  refreshTrader: () => Promise<void>;
}

export interface SignupData {
  username: string;
  displayName: string;
  email?: string;
  passcode: string;
  buddyName?: string;
  applicationNote?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [trader, setTrader] = useState<Trader | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    async function loadSession() {
      const storedId = localStorage.getItem('hkdv_trader_id');
      if (storedId) {
        const { data, error } = await supabase
          .from('traders')
          .select('*')
          .eq('id', storedId)
          .eq('status', 'active')
          .single();

        if (!error && data) {
          setTrader(data as Trader);
        } else {
          localStorage.removeItem('hkdv_trader_id');
        }
      }
      setIsLoading(false);
    }
    loadSession();
  }, []);

  const login = async (username: string, passcode: string): Promise<{ error: string | null }> => {
    // For demo: simple username + passcode_hash check
    // In production, you'd use proper password hashing
    const { data, error } = await supabase
      .from('traders')
      .select('*')
      .eq('username', username)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return { error: 'Invalid username or password' };
    }

    const traderData = data as Trader;
    // Simple passcode check (in production, use bcrypt)
    if (traderData.passcode_hash !== passcode) {
      return { error: 'Invalid username or password' };
    }

    localStorage.setItem('hkdv_trader_id', traderData.id);
    setTrader(traderData);
    return { error: null };
  };

  const signup = async (signupData: SignupData): Promise<{ error: string | null }> => {
    // Check if username exists
    const { data: existing } = await supabase
      .from('traders')
      .select('id')
      .eq('username', signupData.username)
      .single();

    if (existing) {
      return { error: 'Username already taken' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('traders')
      .insert({
        username: signupData.username,
        display_name: signupData.displayName,
        email: signupData.email || null,
        passcode_hash: signupData.passcode,
        buddy_name: signupData.buddyName || null,
        application_note: signupData.applicationNote || null,
        status: 'active',
        is_approved: false,
        strawberry_rank: 0,
        strawberry_title: 'Strawberry Syrup',
        socials: {},
        selected_charm_ids: [],
        charm_visibility: true,
        show_zodiac: true,
        show_identity_charm: false,
        show_pronouns_charm: false,
        avatar_pending_review: false,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    const newTrader = data as Trader;
    localStorage.setItem('hkdv_trader_id', newTrader.id);
    setTrader(newTrader);
    return { error: null };
  };

  const logout = async () => {
    localStorage.removeItem('hkdv_trader_id');
    setTrader(null);
  };

  const refreshTrader = async () => {
    if (!trader) return;
    const { data } = await supabase
      .from('traders')
      .select('*')
      .eq('id', trader.id)
      .single();
    if (data) {
      setTrader(data as Trader);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        trader,
        isLoading,
        isLoggedIn: !!trader,
        login,
        logout,
        signup,
        refreshTrader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
