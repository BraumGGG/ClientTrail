import { describe, expect, it } from "vitest";
import { commandSpecSchema, setupPlanSchema } from "./contracts.js";

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

  it("accepts explicit child environment variables", () => {
    const parsed = commandSpecSchema.parse({
      executable: "node",
      args: ["script.js"],
      cwd: "C:/repo",
      env: { CLIENT_TEST_RUN_ID: "run-123" },
    });
    expect(parsed.env).toEqual({ CLIENT_TEST_RUN_ID: "run-123" });
  });
});
