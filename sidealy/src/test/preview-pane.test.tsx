import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PreviewPane } from "../components/studio/preview-pane";

describe("PreviewPane & Floating Design Palette Secure Protocol", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates targetOrigin correctly and NEVER transmits postMessage with '*'", () => {
    const postMessageSpy = vi.fn();
    const mockContentWindow = { postMessage: postMessageSpy };

    const { container } = render(
      <PreviewPane
        device="desktop"
        previewUrl="http://localhost:5173/preview-app"
        runtimeState="ready"
      />
    );

    const iframe = container.querySelector("iframe");
    expect(iframe).toBeDefined();
    if (iframe) {
      Object.defineProperty(iframe, "contentWindow", {
        value: mockContentWindow,
        writable: true,
      });
    }

    // Select the "select" inspection tool
    const selectBtn = screen.getByTitle("Sélectionner un élément (inspecter / style)");
    fireEvent.click(selectBtn);

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        mode: "select",
        type: "IDEALY_SET_DESIGN_MODE",
      },
      "http://localhost:5173" // STRICT origin, never "*"
    );
    expect(postMessageSpy.mock.calls[0][1]).not.toBe("*");
  });

  it("sends undo and redo messages strictly to targetOrigin", () => {
    const postMessageSpy = vi.fn();
    const mockContentWindow = { postMessage: postMessageSpy };

    const { container } = render(
      <PreviewPane
        device="desktop"
        previewUrl="https://subdomain.idealy.run/my-app"
        runtimeState="ready"
      />
    );

    const iframe = container.querySelector("iframe");
    if (iframe) {
      Object.defineProperty(iframe, "contentWindow", {
        value: mockContentWindow,
        writable: true,
      });
    }

    // Activate a tool to enable undo
    const textBtn = screen.getByTitle("Édition de texte directe");
    fireEvent.click(textBtn);
    expect(postMessageSpy).toHaveBeenLastCalledWith(
      { mode: "text", type: "IDEALY_SET_DESIGN_MODE" },
      "https://subdomain.idealy.run"
    );

    // Click Undo
    const undoBtn = screen.getByTitle("Annuler (Ctrl+Z)");
    fireEvent.click(undoBtn);
    expect(postMessageSpy).toHaveBeenLastCalledWith(
      { type: "IDEALY_DESIGN_UNDO" },
      "https://subdomain.idealy.run"
    );

    // Click Redo
    const redoBtn = screen.getByTitle("Rétablir (Ctrl+Y)");
    fireEvent.click(redoBtn);
    expect(postMessageSpy).toHaveBeenLastCalledWith(
      { type: "IDEALY_DESIGN_REDO" },
      "https://subdomain.idealy.run"
    );
  });

  it("strictly validates incoming messages: ignores messages from unknown origins or invalid sources", async () => {
    const { container } = render(
      <PreviewPane
        device="desktop"
        previewUrl="http://localhost:3000/app"
        runtimeState="ready"
      />
    );

    const iframe = container.querySelector("iframe");
    const iframeWindow = iframe?.contentWindow;
    expect(iframeWindow).toBeDefined();

    // 1. Untrusted message from evil origin
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "IDEALY_DESIGN_ELEMENT_SELECTED", tagName: "HACKED" },
          origin: "http://malicious-site.com",
          source: iframeWindow as Window,
        })
      );
    });
    expect(screen.queryByText(/HACKED/i)).toBeNull();

    // 2. Untrusted message from right origin but wrong source (not iframe contentWindow)
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "IDEALY_DESIGN_ELEMENT_SELECTED", tagName: "SPOOFED" },
          origin: "http://localhost:3000",
          source: window,
        })
      );
    });
    expect(screen.queryByText(/SPOOFED/i)).toBeNull();

    // 3. Legitimate message from iframe contentWindow matching targetOrigin
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "IDEALY_DESIGN_ELEMENT_SELECTED", tagName: "button" },
          origin: "http://localhost:3000",
          source: iframeWindow as Window,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Élément sélectionné : <button>")).toBeDefined();
    });
  });

  it("allows minimizing and expanding the floating design palette", () => {
    render(
      <PreviewPane
        device="desktop"
        previewUrl="http://localhost:3000"
        runtimeState="ready"
      />
    );

    const minimizeBtn = screen.getByTitle("Réduire la palette");
    fireEvent.click(minimizeBtn);

    // In minimized mode, the small expand pill is shown
    const expandBtn = screen.getByTitle("Agrandir la palette Design");
    expect(expandBtn).toBeDefined();

    fireEvent.click(expandBtn);
    expect(screen.getByTitle("Réduire la palette")).toBeDefined();
  });
});
