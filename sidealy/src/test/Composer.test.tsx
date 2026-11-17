import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "../components/chat/Composer";

const mockSendMessage = vi.fn();
let currentDraft = "";
const mockSetDraft = vi.fn((val: string | ((prev: string) => string)) => {
  if (typeof val === "function") {
    currentDraft = val(currentDraft);
  } else {
    currentDraft = val;
  }
});

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    draft: currentDraft,
    setDraft: mockSetDraft,
    sendMessage: mockSendMessage,
    stopGeneration: vi.fn(),
    generationStatus: "idle",
    setActivePage: vi.fn(),
    userWay: "ninja",
    language: "fr",
    deepThink: false,
    webSearch: false,
  }),
}));

describe("Composer Component & Parasitic @agent Mention Stripping Contract", () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockSetDraft.mockClear();
    currentDraft = "";
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("strips parasitic @agent mentions from text and routes agent in options payload", () => {
    currentDraft = "@Naruto crée une application de gestion de stock";

    render(<Composer placement="conversation" />);

    // Click Send button (accessible via title or aria-label)
    const sendBtn = screen.getByLabelText("Envoyer le message");
    fireEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const [sentPrompt, attachments, options] = mockSendMessage.mock.calls[0];

    // 1. Parasitic @agent must be stripped from the prompt body
    expect(sentPrompt).toBe("crée une application de gestion de stock");
    expect(sentPrompt).not.toContain("@Naruto");

    // 2. Attachments should be empty
    expect(attachments).toEqual([]);

    // 3. Agent must be properly captured in metadata
    expect(options.agents).toContain("naruto");
  });

  it("handles @agent in the middle or end of the prompt and strips properly", () => {
    currentDraft = "Génère un composant React accessible @Sasuke s'il te plaît";

    render(<Composer placement="conversation" />);

    const sendBtn = screen.getByLabelText("Envoyer le message");
    fireEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const [sentPrompt, , options] = mockSendMessage.mock.calls[0];

    expect(sentPrompt).toBe("Génère un composant React accessible s'il te plaît");
    expect(sentPrompt).not.toContain("@Sasuke");
    expect(options.agents).toContain("sasuke");
  });

  it("preserves standard prompts without agent mentions intact", () => {
    currentDraft = "Explique-moi comment fonctionne l'authentification OAuth2";

    render(<Composer placement="conversation" />);

    const sendBtn = screen.getByLabelText("Envoyer le message");
    fireEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const [sentPrompt, , options] = mockSendMessage.mock.calls[0];

    expect(sentPrompt).toBe("Explique-moi comment fonctionne l'authentification OAuth2");
    expect(options.agents).toEqual([]);
  });
});
