import { create } from 'zustand';
import { storage } from '../utils/storage';

const KEY = 'workout_prefs';

interface WorkoutPrefs {
  restTimerEnabled: boolean;
  smartRestEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

interface WorkoutPrefsStore extends WorkoutPrefs {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleRestTimer: () => void;
  toggleSmartRest: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
}

const defaults: WorkoutPrefs = {
  restTimerEnabled: true,
  smartRestEnabled: false,
  soundEnabled: true,
  hapticsEnabled: true,
};

async function persist(prefs: WorkoutPrefs) {
  await storage.setItemAsync(KEY, JSON.stringify(prefs));
}

export const useWorkoutPrefsStore = create<WorkoutPrefsStore>((set, get) => ({
  ...defaults,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await storage.getItemAsync(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<WorkoutPrefs>;
        set({ ...defaults, ...saved, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  toggleRestTimer: () => {
    const next = !get().restTimerEnabled;
    set({ restTimerEnabled: next });
    persist({ ...get(), restTimerEnabled: next });
  },
  toggleSmartRest: () => {
    const next = !get().smartRestEnabled;
    set({ smartRestEnabled: next });
    persist({ ...get(), smartRestEnabled: next });
  },
  toggleSound: () => {
    const next = !get().soundEnabled;
    set({ soundEnabled: next });
    persist({ ...get(), soundEnabled: next });
  },
  toggleHaptics: () => {
    const next = !get().hapticsEnabled;
    set({ hapticsEnabled: next });
    persist({ ...get(), hapticsEnabled: next });
  },
}));
