import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["lib/**/*.js"],
      provider: "v8",
      reporter: ["text", "html", "lcov"],
    },
    environment: "node",
    globals: true,
    include: ["test/lib.spec.js", "test/stylus.spec.js"],
  },
});
