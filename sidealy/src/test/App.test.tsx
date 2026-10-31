import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";

describe("Idealy Application Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the core application layout and welcome message", () => {
    render(<App />);
    expect(screen.getAllByText("Idealy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Espace Principal").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Bienvenue sur Idealy").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        "Quelles sont les caractéristiques de ce nouvel environnement Idealy ?",
      ),
    ).toBeInTheDocument();
  });

  it("preserves drafts across conversation changes", async () => {
    render(<App />);

    // Type in composer in current conversation
    const textarea = screen.getByPlaceholderText(/Posez une question/i);
    fireEvent.change(textarea, {
      target: { value: "Brouillon test pour conv 1" },
    });
    expect(textarea).toHaveValue("Brouillon test pour conv 1");

    // Create a new conversation
    const newConvBtn = screen.getByRole("button", {
      name: /Nouvelle conversation/i,
    });
    fireEvent.click(newConvBtn);

    // Verify draft is empty for the new conversation
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });

    // Type a different draft in new conversation
    fireEvent.change(textarea, { target: { value: "Brouillon pour conv 2" } });
    expect(textarea).toHaveValue("Brouillon pour conv 2");

    // Switch back to the first conversation ("Bienvenue sur Idealy")
    const welcomeConvBtns = screen.getAllByRole("button", {
      name: /Bienvenue sur Idealy/i,
    });
    fireEvent.click(welcomeConvBtns[0]);

    // Verify first conversation draft was restored!
    await waitFor(() => {
      expect(textarea).toHaveValue("Brouillon test pour conv 1");
    });
  });

  it("opens and closes the command palette via button and Escape key", async () => {
    render(<App />);

    // Open command palette
    const cmdBtn = screen.getByRole("button", {
      name: /Rechercher ou exécuter une commande/i,
    });
    fireEvent.click(cmdBtn);

    expect(
      screen.getByRole("dialog", { name: /Palette de commandes/i }),
    ).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Palette de commandes/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("cycles themes between Light, Dark, and System", () => {
    render(<App />);

    const themeBtn = screen.getByRole("button", { name: /Changer de thème/i });
    expect(themeBtn).toBeInTheDocument();

    fireEvent.click(themeBtn); // light
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    fireEvent.click(themeBtn); // dark
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switches to Produce mode and creates an artifact on send", async () => {
    render(<App />);

    // Click on "Produire" mode radio button
    const produceBtn = screen.getByRole("radio", { name: /Produire/i });
    fireEvent.click(produceBtn);

    const textarea = screen.getByPlaceholderText(
      /Décrivez le document ou livrable/i,
    );
    fireEvent.change(textarea, {
      target: { value: "Spécification du module d'authentification" },
    });

    const sendBtn = screen.getByRole("button", { name: /Envoyer le message/i });
    fireEvent.click(sendBtn);

    // Verify user message appears in list
    expect(
      screen.getByText("Spécification du module d'authentification"),
    ).toBeInTheDocument();

    // Verify artifact sidecar appears
    await waitFor(
      () => {
        expect(
          screen.getByRole("complementary", { name: /Livrable/i }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
