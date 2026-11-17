import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AccountChip, formatPlanName } from "../components/layout/AccountChip";

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    language: "fr",
    theme: "dark",
    setTheme: vi.fn(),
    setActivePage: vi.fn(),
    setIsCommandPaletteOpen: vi.fn(),
  }),
}));

vi.mock("../services/firebase", () => ({
  authenticatedFetch: vi.fn().mockImplementation((url: string) => {
    if (url.includes("/preferences")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          accountEmail: "founder@idealy.run",
          displayName: "Alex Founder",
        }),
      });
    }
    if (url.includes("/power")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          plan: "pro",
        }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }),
  signOutFirebase: vi.fn(),
}));

describe("AccountChip Plan Formatting & Status Handling Contract", () => {
  describe("formatPlanName()", () => {
    it("formats Free Tier in French, English, and Spanish", () => {
      expect(formatPlanName(undefined, "fr")).toBe("Compte Gratuit");
      expect(formatPlanName(null, "fr")).toBe("Compte Gratuit");
      expect(formatPlanName("", "fr")).toBe("Compte Gratuit");

      expect(formatPlanName(undefined, "en")).toBe("Free Tier");
      expect(formatPlanName(null, "en")).toBe("Free Tier");

      expect(formatPlanName(undefined, "es")).toBe("Plan Gratuito");
      expect(formatPlanName(null, "es")).toBe("Plan Gratuito");
    });

    it("formats Pro plan consistently", () => {
      expect(formatPlanName("pro", "fr")).toBe("Plan Pro");
      expect(formatPlanName("PRO", "en")).toBe("Plan Pro");
      expect(formatPlanName("Pro", "es")).toBe("Plan Pro");
    });

    it("formats Business plan consistently", () => {
      expect(formatPlanName("business", "fr")).toBe("Plan Business");
      expect(formatPlanName("BUSINESS", "en")).toBe("Plan Business");
    });

    it("formats Enterprise plan consistently", () => {
      expect(formatPlanName("enterprise", "fr")).toBe("Plan Enterprise");
      expect(formatPlanName("ENTERPRISE", "es")).toBe("Plan Enterprise");
    });

    it("gracefully falls back to free tier when an unknown or legacy plan string is passed", () => {
      expect(formatPlanName("custom_legacy_plan", "fr")).toBe("Compte Gratuit");
      expect(formatPlanName("tier_unknown", "en")).toBe("Free Tier");
      expect(formatPlanName("random", "es")).toBe("Plan Gratuito");
    });
  });

  describe("AccountChip Component Rendering", () => {
    it("renders user initial, name and plan once loaded", async () => {
      render(<AccountChip onOpenSettings={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("Alex Founder")).toBeDefined();
        expect(screen.getByText("Plan Pro")).toBeDefined();
      });
    });
  });
});
