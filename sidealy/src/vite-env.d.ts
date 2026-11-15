/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom/vitest" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
