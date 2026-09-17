import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IdealyWay } from "@/lib/idealy/product-contract";

export type GamificationState = {
  currentWay: IdealyWay;
  unlockedWays: IdealyWay[];
  powerBalance: number;
  maxPower: number;
  burnDownPercentage: number;
  setWay: (way: IdealyWay) => void;
  unlockWay: (way: IdealyWay) => void;
  setPowerBalance: (balance: number, max?: number) => void;
  consumePower: (amount: number) => void;
  refillPower: (amount: number) => void;
  resetBurnDown: () => void;
};

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      currentWay: "ninja",
      unlockedWays: ["ninja", "mage", "hunter", "professional"],
      powerBalance: 100,
      maxPower: 100,
      burnDownPercentage: 100, // Starts at 100% and decreases (burn-down meter)

      setWay: (way: IdealyWay) => {
        try {
          document.cookie = `idealy_user_way=${way}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {
          // Non-blocking
        }
        set({ currentWay: way });
      },

      unlockWay: (way: IdealyWay) => {
        const { unlockedWays } = get();
        if (!unlockedWays.includes(way)) {
          set({ unlockedWays: [...unlockedWays, way] });
        }
      },

      setPowerBalance: (balance: number, max?: number) => {
        const effectiveMax = max ?? get().maxPower ?? 100;
        const boundedBalance = Math.max(0, balance);
        const percentage = Math.min(100, Math.max(0, Math.round((boundedBalance / effectiveMax) * 100)));
        set({
          powerBalance: boundedBalance,
          maxPower: effectiveMax,
          burnDownPercentage: percentage,
        });
      },

      consumePower: (amount: number) => {
        const { powerBalance, maxPower } = get();
        const newBalance = Math.max(0, powerBalance - amount);
        const percentage = Math.min(100, Math.max(0, Math.round((newBalance / maxPower) * 100)));
        set({
          powerBalance: newBalance,
          burnDownPercentage: percentage,
        });
      },

      refillPower: (amount: number) => {
        const { powerBalance, maxPower } = get();
        const newBalance = powerBalance + amount;
        const newMax = Math.max(maxPower, newBalance);
        const percentage = Math.min(100, Math.max(0, Math.round((newBalance / newMax) * 100)));
        set({
          powerBalance: newBalance,
          maxPower: newMax,
          burnDownPercentage: percentage,
        });
      },

      resetBurnDown: () => {
        set({
          powerBalance: get().maxPower,
          burnDownPercentage: 100,
        });
      },
    }),
    {
      name: "idealy_gamification",
    }
  )
);
