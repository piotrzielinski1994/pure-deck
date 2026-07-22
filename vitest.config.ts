import { createVitestConfig } from "@pziel/pureui/vitest";

export default createVitestConfig({
  appUrl: import.meta.url,
  setupFiles: ["./tests/setup.ts"],
  include: ["tests/**/*.{test,spec}.{ts,tsx}"],
});
