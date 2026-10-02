import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" throws outside Next's server build; it's a no-op in tests.
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
