import { describe, expect, it } from "vitest";
import { diagnoseResult } from "./diagnostics.js";

describe("diagnostics", () => {
  it("maps build failures to build evidence", () => {
    const result = diagnoseResult({ status: "failed", failureKind: "build" });
    expect(result.kind).toBe("build");
    expect(result.evidence).toEqual(["build.stdout.log", "build.stderr.log"]);
    expect(result.remediation).toContain("构建");
  });
});
