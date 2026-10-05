import type { FailureKind, RunResult, RunStatus } from "./contracts.js";

export interface AggregateResult {
  status: RunStatus;
  suites: RunResult[];
  failureKinds: FailureKind[];
}

export function aggregateResults(suites: RunResult[]): AggregateResult {
  if (suites.length === 0) {
    return { status: "blocked", suites, failureKinds: ["capability_not_configured"] };
  }
  const failed = suites.filter((suite) => suite.status !== "passed");
  const status: RunStatus = failed.some((suite) => suite.status === "error")
    ? "error"
    : failed.some((suite) => suite.status === "failed" || suite.status === "timeout" || suite.status === "cancelled")
      ? "failed"
      : failed.some((suite) => suite.status === "blocked" || suite.status === "waiting_human")
        ? "blocked"
        : "passed";
  return {
    status,
    suites,
    failureKinds: [...new Set(failed.flatMap((suite) => suite.failureKind ? [suite.failureKind] : []))],
  };
}
