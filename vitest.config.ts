import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    exclude: [
      "**/node_modules/**",
      ".claude/**",
      ".opencode/**",
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
      include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
      exclude: ["**/__tests__/**", "**/index.ts"],
    },
  },
});
