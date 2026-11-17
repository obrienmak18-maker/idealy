import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPower, powerLevel, type PowerStatus } from "../services/power";

describe("Power Service Quota & Offline Fallback Contract", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("calculates power levels accurately based on balance / walletCap ratio", () => {
    const base: PowerStatus = {
      balance: 100,
      walletCap: 100,
      plan: "free",
      way: "ninja",
      resourceLabel: "Chakra",
      canExecute: true,
      periodKey: "2026-11",
    };

    expect(powerLevel({ ...base, balance: 50, walletCap: 100 })).toBe("ok");
    expect(powerLevel({ ...base, balance: 20, walletCap: 100 })).toBe("low");
    expect(powerLevel({ ...base, balance: 5, walletCap: 100 })).toBe("critical");
    expect(powerLevel({ ...base, balance: 0, walletCap: 100 })).toBe("critical");
  });

  it("returns state: unavailable when network fails and no local cache exists", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network offline"));

    const result = await fetchPower();
    expect(result.state).toBe("unavailable");
  });

  it("returns state: ok with canExecute: false when network fails but valid cache exists", async () => {
    const cachedData: PowerStatus = {
      balance: 42,
      walletCap: 100,
      plan: "pro",
      way: "mage",
      resourceLabel: "Mana",
      canExecute: true,
      periodKey: "2026-11",
    };
    localStorage.setItem("idealy_power_cache", JSON.stringify(cachedData));

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Failed to fetch"));

    const result = await fetchPower();
    expect(result.state).toBe("ok");
    if (result.state === "ok") {
      expect(result.power.balance).toBe(42);
      expect(result.power.canExecute).toBe(false); // MUST be false when served from cache
      expect(result.power.resourceLabel).toBe("Mana");
    }
  });

  it("returns state: signed-out when server returns 401 Unauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    } as unknown as Response);

    const result = await fetchPower();
    expect(result.state).toBe("signed-out");
  });

  it("returns authentic server power and caches it when online", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        balance: 85,
        walletCap: 100,
        plan: "business",
        way: "hunter",
        resourceLabel: "Nen",
        canExecute: true,
        lastMonthlyAllocationAt: "2026-11-01T00:00:00Z",
      }),
    } as unknown as Response);

    const result = await fetchPower();
    expect(result.state).toBe("ok");
    if (result.state === "ok") {
      expect(result.power.balance).toBe(85);
      expect(result.power.walletCap).toBe(100);
      expect(result.power.plan).toBe("business");
      expect(result.power.way).toBe("hunter");
      expect(result.power.resourceLabel).toBe("Nen");
      expect(result.power.canExecute).toBe(true);
    }

    const cached = localStorage.getItem("idealy_power_cache");
    expect(cached).toBeTruthy();
    expect(JSON.parse(cached!).balance).toBe(85);
  });
});
