import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Trader } from '../types/supabase';

// Session helpers
const STORAGE_KEY = 'hkdv_trader_id';

function getSessionId(): string | null {
  return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
}

function setSessionId(id: string, persist: boolean) {
  if (persist) {
    localStorage.setItem(STORAGE_KEY, id);
  } else {
    sessionStorage.setItem(STORAGE_KEY, id);
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

interface AuthContextValue {
  trader: Trader | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (username: string, passcode: string, persist?: boolean) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  signup: (data: SignupData) => Promise<{ error: string | null }>;
  refreshTrader: () => Promise<void>;
  updateTraderField: (field: Partial<Trader>) => void;
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

  // Load session from storage on mount
  useEffect(() => {
    async function loadSession() {
      const storedId = getSessionId();
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
          clearSession();
        }
      }
      setIsLoading(false);
    }
    loadSession();
  }, []);

  const login = async (
    username: string,
    passcode: string,
    persist: boolean = false
  ): Promise<{ error: string | null }> => {
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
    if (traderData.passcode_hash !== passcode) {
      return { error: 'Invalid username or password' };
    }

    setSessionId(traderData.id, persist);
    setTrader(traderData);
    return { error: null };
  };

  const signup = async (signupData: SignupData): Promise<{ error: string | null }> => {
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
    setSessionId(newTrader.id, true);
    setTrader(newTrader);
    return { error: null };
  };

  const logout = async () => {
    clearSession();
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

  const updateTraderField = (field: Partial<Trader>) => {
    if (!trader) return;
    setTrader({ ...trader, ...field });
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
        updateTraderField,
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
