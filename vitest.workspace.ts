import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "root-contract",
      include: ["tests/**/*.test.ts"],
      environment: "node",
    },
  },
  "packages/*/vitest.config.ts",
]);
