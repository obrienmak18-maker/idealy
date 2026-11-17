import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMocks = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
  getBearerToken: vi.fn().mockResolvedValue("test-bearer-xyz"),
}));

vi.mock("../services/firebase", () => ({
  authenticatedFetch: firebaseMocks.authenticatedFetch,
  getBearerToken: firebaseMocks.getBearerToken,
}));

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    setIsMobileDrawerOpen: vi.fn(),
  }),
}));

import { ConnectorsPage } from "../components/ConnectorsPage";

describe("ConnectorsPage Component & Security Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    firebaseMocks.authenticatedFetch.mockImplementation(
      async (url: string, _init?: RequestInit) => {
        const u = String(url);
        if (u.includes("/api/idealy/connectors/status")) {
          return new Response(
            JSON.stringify({
              integrations: [
                {
                  expiresAt: null,
                  provider: "github",
                  serverReady: true,
                  status: "not_connected",
                },
              ],
            }),
            { headers: { "Content-Type": "application/json" }, status: 200 }
          );
        }
        if (u.includes("/api/idealy/plugins")) {
          return new Response(JSON.stringify({ plugins: [] }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }
    );
  });

  it("renders the connectors page and displays connectors", async () => {
    render(<ConnectorsPage />);
    await waitFor(() => {
      expect(screen.getByText("Connecteurs & Outils")).toBeInTheDocument();
    });
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("never reads or writes tokens in localStorage when testing or saving credentials", async () => {
    render(<ConnectorsPage />);

    const githubCard = await screen.findByRole("button", { name: /GitHub/i });
    fireEvent.click(githubCard);

    // Toggle advanced/PAT configuration
    const togglePat = await screen.findByRole("button", {
      name: /Paramètres avancés/i,
    });
    fireEvent.click(togglePat);

    const tokenInput = screen.getByLabelText(/Jeton d'accès personnalisé/i);
    fireEvent.change(tokenInput, {
      target: { value: "mock_secret_token_12345" },
    });

    // Mock test endpoint
    firebaseMocks.authenticatedFetch.mockImplementationOnce(
      async (url: string, init?: RequestInit) => {
        expect(String(url)).toBe("/api/idealy/connectors/test");
        const body = JSON.parse(init?.body as string);
        expect(body.provider).toBe("github");
        expect(body.token).toBe("mock_secret_token_12345");
        return new Response(
          JSON.stringify({
            account: { login: "alicedev", name: "Alice Developer" },
            latencyMs: 142,
            success: true,
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      }
    );

    const testButton = screen.getByRole("button", { name: /Tester la clé/i });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Authentification réussie auprès de GitHub \(Alice Developer\) — latence : 142ms/i
        )
      ).toBeInTheDocument();
    });

    // Verify localStorage has NOT been touched
    expect(localStorage.getItem("idealy_connector_key_github")).toBeNull();

    // Mock save credentials endpoint
    firebaseMocks.authenticatedFetch.mockImplementationOnce(
      async (url: string, init?: RequestInit) => {
        expect(String(url)).toBe("/api/idealy/connectors/credentials");
        const body = JSON.parse(init?.body as string);
        expect(body.provider).toBe("github");
        expect(body.token).toBe("mock_secret_token_12345");
        return new Response(
          JSON.stringify({
            displayName: "Alice Developer",
            provider: "github",
            status: "connected",
            success: true,
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      }
    );

    const saveButton = screen.getByRole("button", { name: /Enregistrer/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Connecteur GitHub enregistré et activé sur le serveur/i
        )
      ).toBeInTheDocument();
    });

    // Verify ZERO token in localStorage after saving!
    expect(localStorage.getItem("idealy_connector_key_github")).toBeNull();
  });

  it("calls the server disconnect route when disconnecting a connector", async () => {
    // Start with GitHub connected
    firebaseMocks.authenticatedFetch.mockImplementation(async (url: string) => {
      if (String(url).includes("/api/idealy/connectors/status")) {
        return new Response(
          JSON.stringify({
            integrations: [
              {
                expiresAt: null,
                provider: "github",
                serverReady: true,
                status: "connected",
              },
            ],
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(<ConnectorsPage />);

    const connectedGithubCard = await screen.findByRole("button", {
      name: /GitHub.*Connecté/i,
    });
    fireEvent.click(connectedGithubCard);

    // Mock disconnect endpoint
    let disconnectCalled = false;
    firebaseMocks.authenticatedFetch.mockImplementation(
      async (url: string, init?: RequestInit) => {
        if (String(url) === "/api/idealy/connectors/disconnect") {
          disconnectCalled = true;
          const body = JSON.parse(init?.body as string);
          expect(body.provider).toBe("github");
          return new Response(
            JSON.stringify({
              provider: "github",
              status: "not_connected",
              success: true,
            }),
            { headers: { "Content-Type": "application/json" }, status: 200 }
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }
    );

    const disconnectBtn = await screen.findByRole("button", {
      name: /Déconnecter/i,
    });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(disconnectCalled).toBe(true);
    });

    expect(localStorage.getItem("idealy_connector_key_github")).toBeNull();
  });
});
