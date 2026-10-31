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
