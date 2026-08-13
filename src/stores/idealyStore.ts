import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WayId } from '@/lore/ways';
import type { MissionDNA, ValidationReport } from '@/core/mission/contracts';

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
  lastRefill: string;
}

export interface MissionHistory {
  id: string;
  title: string;
  createdAt: number;
  way: WayId;
  previewReady: boolean;
  status?: 'draft' | 'planned' | 'building' | 'ready' | 'needs-fix' | 'published';
  validation?: ValidationReport;
}

/**
 * Public browser configuration is kept for Supabase only. Server credentials
 * remain accepted for backwards compatibility with old projects but are never
 * persisted by the store and are not used by the new connector registry.
 */
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
  collaborationRoom?: string;
}

export interface IdealyState {
  stage: AuthStage;
  way: WayId | null;
  profile: UserProfile | null;
  energy: EnergyState;
  theme: 'dark' | 'light';
  onboarded: boolean;
  missions: MissionHistory[];
  activeMissionId: string | null;
  missionDNA: Record<string, MissionDNA>;
  connectors: IdealyConnectors;

  setStage: (s: AuthStage) => void;
  setWay: (w: WayId) => void;
  setProfile: (p: UserProfile) => void;
  setTheme: (t: 'dark' | 'light') => void;
  completeOnboarding: () => void;
  signOut: () => void;
  setEnergy: (energy: EnergyState) => void;
  consumeEnergy: (amount: number) => void;
  refillEnergy: () => void;
  addMission: (mission: MissionHistory) => void;
  updateMission: (id: string, updates: Partial<MissionHistory>) => void;
  setMissions: (missions: MissionHistory[]) => void;
  setActiveMissionId: (id: string | null) => void;
  setMissionDNA: (missionId: string, dna: MissionDNA) => void;
  updateMissionDNA: (missionId: string, updater: (dna: MissionDNA) => MissionDNA) => void;
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
      activeMissionId: null,
      missionDNA: {},
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
          activeMissionId: null,
          energy: { current: DAILY_MAX, max: DAILY_MAX, lastRefill: today() },
        }),
      setEnergy: (energy) => set({ energy }),
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
      updateMission: (id, updates) =>
        set((state) => ({
          missions: state.missions.map((mission) =>
            mission.id === id ? { ...mission, ...updates } : mission,
          ),
        })),
      setMissions: (missions) => set({ missions }),
      setActiveMissionId: (activeMissionId) => set({ activeMissionId }),
      setMissionDNA: (missionId, dna) =>
        set((state) => ({ missionDNA: { ...state.missionDNA, [missionId]: dna } })),
      updateMissionDNA: (missionId, updater) =>
        set((state) => {
          const current = state.missionDNA[missionId];
          return current
            ? { missionDNA: { ...state.missionDNA, [missionId]: updater(current) } }
            : state;
        }),
      updateConnectors: (updates) =>
        set((state) => ({ connectors: { ...state.connectors, ...updates } })),
      updateConnector: (provider, value) =>
        set((state) => ({ connectors: { ...state.connectors, [provider]: value } })),
    }),
    {
      name: 'idealy-state',
      partialize: (state) => ({
        way: state.way,
        profile: state.profile,
        theme: state.theme,
        onboarded: state.onboarded,
        energy: state.energy,
        missions: state.missions,
        activeMissionId: state.activeMissionId,
        missionDNA: state.missionDNA,
        // Only public Supabase browser configuration persists across reloads.
        connectors: {
          supabaseUrl: state.connectors.supabaseUrl,
          supabaseAnonKey: state.connectors.supabaseAnonKey,
        },
      }),
      version: 4,
      merge: (persistedState, currentState) => {
        const saved = persistedState as Partial<IdealyState>;
        return {
          ...currentState,
          ...saved,
          missionDNA: saved.missionDNA ?? currentState.missionDNA,
          connectors: saved.connectors ?? currentState.connectors,
        };
      },
    },
  ),
);
