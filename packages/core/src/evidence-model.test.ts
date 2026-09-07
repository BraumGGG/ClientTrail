import { describe, expect, it } from "vitest";
import { evidenceClosureSchema, stateTransitionSchema } from "./evidence-model.js";

describe("evidence model", () => {
  it("validates state transitions and evidence closure", () => {
    expect(stateTransitionSchema.parse({ from: "running", to: "passed", at: new Date().toISOString(), runId: "run-1" }).to).toBe("passed");
    expect(evidenceClosureSchema.parse({ assertionId: "a1", status: "incomplete", requiredKinds: ["api"], references: [], missingKinds: ["api"] }).status).toBe("incomplete");
  });
});
