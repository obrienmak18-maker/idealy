import "@testing-library/jest-dom/vitest";

// Polyfill window.matchMedia for JSDOM
Object.defineProperty(window, "matchMedia", {
  value: (query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  }),
  writable: true,
});

// Polyfill scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {};

// Handle relative URLs in Node/JSDOM fetch
const originalFetch = global.fetch;
if (originalFetch) {
  global.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/")) {
      return originalFetch(`http://localhost${input}`, init);
    }
    return originalFetch(input, init);
  };
}

