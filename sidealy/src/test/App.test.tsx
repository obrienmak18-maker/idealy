import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";

describe("Idealy Application Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the core application layout and welcome message", () => {
    render(<App />);
    expect(screen.getAllByText(/Idealy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nouvelle discussion/i).length).toBeGreaterThan(0);
    expect(
      screen.getByPlaceholderText(/Message à Idealy/i),
    ).toBeInTheDocument();
  });

  it("preserves drafts across conversation changes", async () => {
    render(<App />);

    // Type in composer in current conversation
    const textarea = screen.getByPlaceholderText(/Message à Idealy/i);
    fireEvent.change(textarea, {
      target: { value: "Brouillon test pour conv 1" },
    });
    expect(textarea).toHaveValue("Brouillon test pour conv 1");

    // Create a new conversation
    const newConvBtn = screen.getAllByTitle(/Nouvelle conversation/i)[0];
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

  it("opens and closes the search via Ctrl+K and Escape key", async () => {
    render(<App />);

    // Open command palette via keyboard shortcut Ctrl+K
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /Rechercher/i }),
      ).toBeInTheDocument();
    });

    // Press Escape to close
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Rechercher/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("sends a message and displays it in the conversation", async () => {
    render(<App />);

    const textarea = screen.getByPlaceholderText(/Message à Idealy/i);
    fireEvent.change(textarea, {
      target: { value: "Spécification du module d'authentification" },
    });

    const sendBtn = screen.getByRole("button", { name: /Envoyer le message/i });
    fireEvent.click(sendBtn);

    // Verify user message appears in list
    expect(
      screen.getAllByText("Spécification du module d'authentification").length,
    ).toBeGreaterThan(0);
  });
});
