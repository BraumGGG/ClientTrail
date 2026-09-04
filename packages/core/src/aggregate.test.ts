import { describe, expect, it } from "vitest";
import { aggregateResults } from "./aggregate.js";

describe("aggregate results", () => {
  it("fails when any suite fails and preserves failure kinds", () => {
    const result = aggregateResults([{ status: "passed" }, { status: "failed", failureKind: "backend" }, { status: "failed", failureKind: "backend" }]);
    expect(result.status).toBe("failed");
    expect(result.failureKinds).toEqual(["backend"]);
    expect(result.suites).toHaveLength(3);
  });
});
