import { describe, expect, it } from "vitest";
import { aggregateResults } from "./aggregate.js";

describe("aggregate results", () => {
  it("fails when any suite fails and preserves failure kinds", () => {
    const result = aggregateResults([{ status: "passed" }, { status: "failed", failureKind: "backend" }, { status: "failed", failureKind: "backend" }]);
    expect(result.status).toBe("failed");
    expect(result.failureKinds).toEqual(["backend"]);
    expect(result.suites).toHaveLength(3);
  });

  it("preserves objective summaries and evidence warnings from suites", () => {
    const suite = {
      status: "blocked" as const,
      failureKind: "evidence_incomplete" as const,
      objectiveSummary: {
        objectives: [{ id: "share", required: true, state: "not_executed" as const }],
        counts: { passed: 0, failed: 0, blocked: 0, notExecuted: 1 },
        allRequiredPassed: false,
      },
      evidenceWarnings: ["stdout.log is empty"],
    };
    const result = aggregateResults([suite]);
    expect(result.status).toBe("failed");
    expect(result.suites[0]).toBe(suite);
  });
});
