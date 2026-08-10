import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WayId } from '@/lore/ways';

export type AuthStage =
  | 'guest'
  | 'authenticated'
  | 'choosing-way'
  | 'creating-profile'
  | 'ready';

export interface UserProfile {
  email: string;
  displayName: string;
  avatarHue: number;
}

export interface EnergyState {
  current: number;
  max: number;
  lastRefill: string; // ISO date (YYYY-MM-DD)
}

export interface MissionHistory {
  id: string;
  title: string;
  createdAt: number;
  way: WayId;
  previewReady: boolean;
}

export interface IdealyConnectors {
  vercelToken?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  firebaseConfig?: string;
  githubToken?: string;
  stripeSecretKey?: string;
  clerkSecretKey?: string;
  openAIApiKey?: string;
  webcontainerKey?: string;
  collaborationRoom?: string; // Yjs room ID for real-time collab
}

export interface IdealyState {
  stage: AuthStage;
  way: WayId | null;
  profile: UserProfile | null;
  energy: EnergyState;
  theme: 'dark' | 'light';
  onboarded: boolean;
  missions: MissionHistory[];
  connectors: IdealyConnectors;

  setStage: (s: AuthStage) => void;
  setWay: (w: WayId) => void;
  setProfile: (p: UserProfile) => void;
  setTheme: (t: 'dark' | 'light') => void;
  completeOnboarding: () => void;
  signOut: () => void;
  consumeEnergy: (amount: number) => void;
  refillEnergy: () => void;
  addMission: (mission: MissionHistory) => void;
  updateMission: (id: string, updates: Partial<MissionHistory>) => void;
  updateConnectors: (updates: Partial<IdealyConnectors>) => void;
  updateConnector: (provider: keyof IdealyConnectors, value: string) => void;
}

const DAILY_MAX = 100;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useIdealyStore = create<IdealyState>()(
  persist(
    (set, get) => ({
      stage: 'guest',
      way: null,
      profile: null,
      energy: { current: DAILY_MAX, max: DAILY_MAX, lastRefill: today() },
      theme: 'dark',
      onboarded: false,
      missions: [],
      connectors: {},

      setStage: (s) => set({ stage: s }),
      setWay: (w) => set({ way: w }),
      setProfile: (p) => set({ profile: p }),
      setTheme: (t) => set({ theme: t }),
      completeOnboarding: () => set({ onboarded: true, stage: 'ready' }),
      signOut: () =>
        set({
          stage: 'guest',
          way: null,
          profile: null,
          onboarded: false,
          energy: { current: DAILY_MAX, max: DAILY_MAX, lastRefill: today() },
        }),
      consumeEnergy: (amount) => {
        const e = get().energy;
        const next = Math.max(0, e.current - amount);
        set({ energy: { ...e, current: next } });
      },
      refillEnergy: () => {
        const e = get().energy;
        if (e.lastRefill !== today()) {
          set({ energy: { current: e.max, max: e.max, lastRefill: today() } });
        }
      },
      addMission: (mission) => set((state) => ({ missions: [mission, ...state.missions] })),
      updateMission: (id, updates) => set((state) => ({
        missions: state.missions.map(m => m.id === id ? { ...m, ...updates } : m)
      })),
      updateConnectors: (updates) => set((state) => ({
        connectors: { ...state.connectors, ...updates }
      })),
      updateConnector: (provider, value) => set((state) => ({
        connectors: { ...state.connectors, [provider]: value }
      })),
    }),
    {
      name: 'idealy-state',
      partialize: (s) => ({
        way: s.way,
        profile: s.profile,
        theme: s.theme,
        onboarded: s.onboarded,
        energy: s.energy,
        missions: s.missions,
        connectors: s.connectors,
      }),
      version: 2,
      merge: (persistedState, currentState) => {
        const saved = persistedState as Partial<IdealyState>;
        return {
          ...currentState,
          ...saved,
          connectors: saved.connectors ?? currentState.connectors,
        };
      },
    },
  ),
);
