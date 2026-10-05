import { describe, expect, it } from "vitest";
import { aggregateResults } from "./aggregate.js";

describe("aggregate results", () => {
  it("blocks a request with no detected runnable suite", () => {
    expect(aggregateResults([])).toEqual({ status: "blocked", suites: [], failureKinds: ["capability_not_configured"] });
  });
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
    expect(result.status).toBe("blocked");
    expect(result.suites[0]).toBe(suite);
  });

  it("keeps a mixed passed and not-configured request blocked", () => {
    const result = aggregateResults([
      { status: "passed", adapterId: "cargo-test" },
      { status: "blocked", adapterId: "tauri-2", failureKind: "capability_not_configured" },
    ]);
    expect(result.status).toBe("blocked");
    expect(result.failureKinds).toEqual(["capability_not_configured"]);
  });

  it("prioritizes errors and failures over blocked suites", () => {
    expect(aggregateResults([{ status: "blocked" }, { status: "failed" }]).status).toBe("failed");
    expect(aggregateResults([{ status: "failed" }, { status: "error" }]).status).toBe("error");
  });
});
