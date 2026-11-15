import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMocks = vi.hoisted(() => {
  const user = {
    email: "test@idealy.example",
    emailVerified: true,
    getIdToken: vi.fn().mockResolvedValue("firebase-test-token"),
    reload: vi.fn().mockResolvedValue(undefined),
    uid: "firebase-test-user",
  };
  const auth = {
    authStateReady: vi.fn().mockResolvedValue(undefined),
    currentUser: user as typeof user | null,
  };
  return {
    auth,
    createBackendSession: vi.fn().mockResolvedValue(undefined),
    ensureFirebaseConfigured: vi.fn().mockResolvedValue(true),
    getBearerToken: vi.fn().mockResolvedValue("firebase-test-token"),
    getFirebaseAuth: vi.fn(() => auth),
    user,
  };
});

vi.mock("../services/firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/firebase")>();
  return {
    ...actual,
    createBackendSession: firebaseMocks.createBackendSession,
    ensureFirebaseConfigured: firebaseMocks.ensureFirebaseConfigured,
    getBearerToken: firebaseMocks.getBearerToken,
    getFirebaseAuth: firebaseMocks.getFirebaseAuth,
  };
});

import App from "../App";
import { AssistantRemoteService } from "../services/assistantRemote";
import { BackendHistoryService } from "../services/backendHistory";

describe("Idealy Application Suite", () => {
  beforeEach(() => {
    firebaseMocks.auth.currentUser = firebaseMocks.user;
    firebaseMocks.ensureFirebaseConfigured.mockResolvedValue(true);
    firebaseMocks.createBackendSession.mockResolvedValue(undefined);
    firebaseMocks.getBearerToken.mockResolvedValue("firebase-test-token");
    const originalFetch = global.fetch;
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/api/idealy/profile/onboarding")) {
        return new Response(JSON.stringify({ onboardingCompleted: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
      return originalFetch(input, init);
    });
    window.history.replaceState({}, "", "/");
    localStorage.clear();
    localStorage.setItem("idealy_session", "active");
    vi.spyOn(BackendHistoryService, "listAndImport").mockResolvedValue({
      conversations: [],
      cursor: null,
      hasMore: false,
    });
    vi.spyOn(BackendHistoryService, "loadMessages").mockResolvedValue([]);
  });

  afterEach(() => {
    firebaseMocks.auth.currentUser = firebaseMocks.user;
    vi.restoreAllMocks();
  });

  it("restores a valid Firebase identity when the Studio route is opened directly", async () => {
    localStorage.clear();
    window.history.replaceState({}, "", "/studio");

    render(<App />);

    expect(
      await screen.findByPlaceholderText(/Message à Idealy/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Passez de l’idée/i)).not.toBeInTheDocument();
  });

  it("redirects a direct Studio visit to login when Firebase has no user", async () => {
    firebaseMocks.auth.currentUser = null;
    localStorage.clear();
    window.history.replaceState({}, "", "/studio");

    render(<App />);

    expect(
      await screen.findByText("Heureux de vous revoir")
    ).toBeInTheDocument();
  });

  it("renders the core application layout and welcome message", async () => {
    render(<App />);
    await screen.findByPlaceholderText(/Message à Idealy/i);
    expect(screen.getAllByText(/Idealy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nouvelle discussion/i).length).toBeGreaterThan(
      0
    );
    expect(
      await screen.findByPlaceholderText(/Message à Idealy/i)
    ).toBeInTheDocument();
  });

  it("preserves drafts across conversation changes", async () => {
    render(<App />);

    // Type in composer in current conversation
    const textarea = await screen.findByPlaceholderText(/Message à Idealy/i);
    fireEvent.change(textarea, {
      target: { value: "Brouillon test pour conv 1" },
    });
    expect(textarea).toHaveValue("Brouillon test pour conv 1");

    // Create a new conversation
    const [newConvBtn] = screen.getAllByTitle(/Nouvelle conversation/i);
    fireEvent.click(newConvBtn);

    // Verify draft is empty for the new conversation
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });

    // Type a different draft in new conversation
    fireEvent.change(textarea, { target: { value: "Brouillon pour conv 2" } });
    expect(textarea).toHaveValue("Brouillon pour conv 2");

    // Switch back to the previous conversation
    const convButtons = screen.getAllByRole("button", {
      name: /Discussion/i,
    });
    if (convButtons.length > 1) {
      fireEvent.click(convButtons[1]);
      await waitFor(() => {
        expect(textarea).toHaveValue("Brouillon test pour conv 1");
      });
    }
  });

  it("keeps the workbench scoped to the active conversation", async () => {
    localStorage.setItem(
      "idealy_messages_v1",
      JSON.stringify([
        {
          content: "Créer une page de présentation",
          conversationId: "conv-welcome",
          createdAt: Date.now() - 1000,
          id: "message-old-project",
          mode: "chat",
          role: "user",
        },
      ])
    );
    localStorage.setItem(
      "idealy_artifacts_v1",
      JSON.stringify([
        {
          content:
            "<!doctype html><html><body><h1>Ancien projet</h1></body></html>",
          conversationId: "conv-welcome",
          createdAt: Date.now(),
          id: "artifact-old-project",
          language: "html",
          title: "index.html",
          type: "code",
        },
      ])
    );

    render(<App />);
    await screen.findByPlaceholderText(/Message à Idealy/i);

    expect(
      screen.getByLabelText("Espace de prévisualisation et de création")
    ).toBeInTheDocument();
    expect(screen.getByTitle(/Aperçu interactif/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByTitle(/Nouvelle conversation/i)[0]);

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Espace de prévisualisation et de création")
      ).not.toBeInTheDocument();
    });
    expect(screen.queryByTitle(/Aperçu interactif/)).not.toBeInTheDocument();
  });

  it("creates a fresh conversation when the current blank chat still owns an artifact", async () => {
    localStorage.setItem(
      "idealy_artifacts_v1",
      JSON.stringify([
        {
          content:
            "<!doctype html><html><body><h1>Ancien projet</h1></body></html>",
          conversationId: "conv-welcome",
          createdAt: Date.now(),
          id: "orphaned-artifact",
          language: "html",
          title: "index.html",
          type: "code",
        },
      ])
    );

    render(<App />);
    await screen.findByPlaceholderText(/Message à Idealy/i);
    expect(
      screen.getByLabelText("Espace de prévisualisation et de création")
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByTitle(/Nouvelle conversation/i)[0]);

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Espace de prévisualisation et de création")
      ).not.toBeInTheDocument();
    });
  });

  it("does not render the workbench on the settings page", async () => {
    localStorage.setItem(
      "idealy_artifacts_v1",
      JSON.stringify([
        {
          content:
            "<!doctype html><html><body><h1>Workspace</h1></body></html>",
          conversationId: "conv-welcome",
          createdAt: Date.now(),
          id: "artifact-settings-test",
          language: "html",
          title: "index.html",
          type: "code",
        },
      ])
    );
    render(<App />);
    await screen.findByPlaceholderText(/Message à Idealy/i);

    expect(
      screen.getByLabelText("Espace de prévisualisation et de création")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Paramètres généraux"));

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Espace de prévisualisation et de création")
      ).not.toBeInTheDocument();
    });
  });

  it("opens and closes the command palette via Ctrl+K and Escape key", async () => {
    render(<App />);

    // Open command palette via keyboard shortcut Ctrl+K
    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Rechercher dans vos discussions/i)
      ).toBeInTheDocument();
    });

    // Press Escape to close
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(/Rechercher dans vos discussions/i)
      ).not.toBeInTheDocument();
    });
  });

  it("sends a message and displays it in the conversation", async () => {
    const remoteStream = vi
      .spyOn(AssistantRemoteService, "streamResponse")
      .mockImplementation(async (options) => {
        options.callbacks.onChunk("Réponse simulée pour le test.");
        options.callbacks.onComplete?.();
      });
    render(<App />);

    const textarea = await screen.findByPlaceholderText(/Message à Idealy/i);
    fireEvent.change(textarea, {
      target: { value: "Spécification du module d'authentification" },
    });

    const sendBtn = screen.getByRole("button", { name: /Envoyer le message/i });
    fireEvent.click(sendBtn);

    // Verify the user message and a fully completed local stream appear.
    await waitFor(() => {
      expect(
        screen.getAllByText("Spécification du module d'authentification").length
      ).toBeGreaterThan(0);
      expect(remoteStream).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText("Réponse simulée pour le test.")
    ).toBeInTheDocument();
  });
});
