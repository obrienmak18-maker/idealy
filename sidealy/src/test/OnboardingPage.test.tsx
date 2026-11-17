import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMocks = vi.hoisted(() => ({
  getBearerToken: vi.fn().mockResolvedValue("test-token-xyz"),
}));

vi.mock("../services/firebase", () => ({
  getBearerToken: firebaseMocks.getBearerToken,
}));

let mockLanguage: "fr" | "en" | "es" = "fr";
const mockSetActivePage = vi.fn();

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    language: mockLanguage,
    setActivePage: mockSetActivePage,
  }),
}));

import { OnboardingPage } from "../components/auth/OnboardingPage";

describe("OnboardingPage i18n & Submission Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders French strings when language is fr", () => {
    mockLanguage = "fr";
    render(<OnboardingPage />);
    expect(screen.getByText("Que souhaitez-vous créer ?")).toBeInTheDocument();
    expect(screen.getByText("SaaS & Abonnements")).toBeInTheDocument();
    expect(screen.getByText("Continuer")).toBeInTheDocument();
  });

  it("renders English strings when language is en", () => {
    mockLanguage = "en";
    render(<OnboardingPage />);
    expect(screen.getByText("What do you want to create?")).toBeInTheDocument();
    expect(screen.getByText("SaaS & Subscriptions")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("renders Spanish strings when language is es", () => {
    mockLanguage = "es";
    render(<OnboardingPage />);
    expect(screen.getByText("¿Qué desea crear?")).toBeInTheDocument();
    expect(screen.getByText("SaaS y Suscripciones")).toBeInTheDocument();
    expect(screen.getByText("Continuar")).toBeInTheDocument();
  });

  it("submits the correct preferredLanguage and profile data on completion", async () => {
    mockLanguage = "en";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ onboardingCompleted: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    );

    render(<OnboardingPage />);

    // Step 0: Goal
    const goalInput = screen.getByPlaceholderText(
      "E.g., a customer and sales management platform for small businesses."
    );
    fireEvent.change(goalInput, { target: { value: "Build an invoice tracker" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 1: Way (default is mage)
    await waitFor(() => {
      expect(screen.getByText("Choose your Energy Way")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2: Name & Experience
    await waitFor(() => {
      expect(screen.getByText("Your creator profile")).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText("Your first name or nickname");
    fireEvent.change(nameInput, { target: { value: "Alice" } });

    fireEvent.click(screen.getByRole("button", { name: "Enter Idealy ✦" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    }, { timeout: 10000 });

    const [url, requestInit] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/idealy/profile/onboarding");
    const body = JSON.parse(requestInit?.body as string);
    expect(body.preferredLanguage).toBe("en");
    expect(body.firstName).toBe("Alice");
    expect(body.primaryGoal).toBe("Build an invoice tracker");
    expect(mockSetActivePage).toHaveBeenCalledWith("chat");
  }, 15000);
});
