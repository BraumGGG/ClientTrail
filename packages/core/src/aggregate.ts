import type { FailureKind, RunResult, RunStatus } from "./contracts.js";

export interface AggregateResult {
  status: RunStatus;
  suites: RunResult[];
  failureKinds: FailureKind[];
}

export function aggregateResults(suites: RunResult[]): AggregateResult {
  const failed = suites.filter((suite) => suite.status !== "passed");
  return {
    status: failed.length === 0 ? "passed" : failed.some((suite) => suite.status === "error") ? "error" : "failed",
    suites,
    failureKinds: [...new Set(failed.flatMap((suite) => suite.failureKind ? [suite.failureKind] : []))],
  };
}
