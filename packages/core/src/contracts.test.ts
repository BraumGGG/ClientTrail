import { describe, expect, it } from "vitest";
import { setupPlanSchema } from "./contracts.js";

describe("core contracts", () => {
  it("validates the structural shape of a setup plan", () => {
    expect(() => setupPlanSchema.parse({
      projectRoot: "C:/repo",
      dependencies: [],
      filesToCreate: ["C:/outside/file.ts"],
      filesToModify: [],
      commands: [],
      productionRisk: "none",
    })).not.toThrow();
  });

  it("represents commands structurally", () => {
    expect(() => setupPlanSchema.parse({
      projectRoot: "C:/repo", dependencies: [], filesToCreate: [], filesToModify: [],
      commands: [{ executable: "pnpm", args: ["install"], cwd: "C:/repo" }], productionRisk: "none",
    })).not.toThrow();
  });
});
