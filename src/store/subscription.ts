import { create } from 'zustand';
import { api } from '../api/client';

export type SubscriptionTier = 'FREE' | 'PRO' | 'ELITE';

interface SubscriptionStore {
  tier: SubscriptionTier;
  isAdmin: boolean;
  loading: boolean;
  fetchTier: () => Promise<void>;
  applyPromo: (code: string) => Promise<{ tier: SubscriptionTier; message: string }>;
  setTier: (tier: SubscriptionTier) => void;
  setAdminTier: (tier: SubscriptionTier) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  tier: 'FREE',
  isAdmin: false,
  loading: false,

  fetchTier: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/api/subscriptions/status');
      const tier = (data?.tier ?? 'FREE') as SubscriptionTier;
      // Fetch isAdmin from /api/users/me alongside tier
      const meRes = await api.get('/api/users/me').catch(() => ({ data: null }));
      const isAdmin = meRes.data?.isAdmin ?? false;
      set({ tier, isAdmin });
    } catch {
      // silently fail — keep current tier
    } finally {
      set({ loading: false });
    }
  },

  applyPromo: async (code: string) => {
    const { data } = await api.post('/api/subscriptions/promo', { code });
    const tier = (data?.tier ?? 'FREE') as SubscriptionTier;
    set({ tier });
    return { tier, message: data?.message ?? `${data?.label} activated!` };
  },

  setTier: (tier) => set({ tier }),

  setAdminTier: async (tier: SubscriptionTier) => {
    await api.patch('/api/admin/users/me/tier', { tier });
    set({ tier });
  },
}));

export function isPro(tier: SubscriptionTier): boolean {
  return tier === 'PRO' || tier === 'ELITE';
}

export function isElite(tier: SubscriptionTier): boolean {
  return tier === 'ELITE';
}
