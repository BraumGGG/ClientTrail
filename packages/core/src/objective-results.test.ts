import { describe, expect, it } from "vitest";
import type { TestContract } from "./contracts.js";
import { objectiveEventSchema, summarizeObjectiveEvents } from "./objective-results.js";

const contract: TestContract = {
  contractVersion: 1,
  objectives: [
    { id: "launch", description: "launch", required: true },
    { id: "share", description: "share", required: true },
    { id: "optional", description: "optional", required: false },
  ],
  preconditions: [],
  requiredCapabilities: [],
  optionalDegradations: [],
  passCriteria: [],
  failCriteria: [],
  blockedCriteria: [],
};

describe("objective results", () => {
  it("uses the latest terminal event and marks missing required objectives not_executed", () => {
    const summary = summarizeObjectiveEvents(contract, [
      { runId: "run-1", objectiveId: "launch", state: "started", at: "2026-09-20T00:00:00.000Z" },
      { runId: "run-1", objectiveId: "launch", state: "passed", at: "2026-09-20T00:00:01.000Z" },
    ]);
    expect(summary.objectives).toEqual([
      expect.objectContaining({ id: "launch", state: "passed", required: true }),
      expect.objectContaining({ id: "share", state: "not_executed", required: true }),
    ]);
    expect(summary.counts).toEqual({ passed: 1, failed: 0, blocked: 0, notExecuted: 1 });
    expect(summary.allRequiredPassed).toBe(false);
  });

  it("preserves the blocking root id", () => {
    const summary = summarizeObjectiveEvents(contract, [
      { runId: "run-1", objectiveId: "launch", state: "failed", failureKind: "launch", at: "2026-09-20T00:00:01.000Z" },
      { runId: "run-1", objectiveId: "share", state: "blocked", blockedBy: "launch", at: "2026-09-20T00:00:02.000Z" },
    ]);
    expect(summary.objectives.find((item) => item.id === "share")?.blockedBy).toBe("launch");
    expect(summary.counts).toEqual({ passed: 0, failed: 1, blocked: 1, notExecuted: 0 });
  });

  it("rejects blocked events without blockedBy", () => {
    expect(() => objectiveEventSchema.parse({
      runId: "run-1",
      objectiveId: "share",
      state: "blocked",
      at: "2026-09-20T00:00:00.000Z",
    })).toThrow();
  });
});
