import "@testing-library/jest-dom/vitest";

// Node 26 + JSDOM can expose window without installing Web Storage on the
// Vitest global. App.test.tsx uses the browser global directly, so provide a
// standards-shaped in-memory implementation when JSDOM has no usable storage.
function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(String(key)) ? values.get(String(key))! : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(String(key));
    },
    setItem(key: string, value: string) {
      values.set(String(key), String(value));
    },
  };
}

let localStorageForTests: Storage;
try {
  localStorageForTests = window.localStorage ?? createMemoryStorage();
} catch {
  localStorageForTests = createMemoryStorage();
}
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageForTests,
  writable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageForTests,
  writable: true,
});

let sessionStorageForTests: Storage;
try {
  sessionStorageForTests = window.sessionStorage ?? createMemoryStorage();
} catch {
  sessionStorageForTests = createMemoryStorage();
}
Object.defineProperty(window, "sessionStorage", {
  configurable: true,
  value: sessionStorageForTests,
  writable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: sessionStorageForTests,
  writable: true,
});

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

