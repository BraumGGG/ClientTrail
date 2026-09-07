import { describe, expect, it } from "vitest";
import { detectIsolationConflicts, faultMatrixSchema, qualityDimensionsSchema } from "./advanced-models.js";

describe("advanced test models", () => {
  it("blocks shared writable instance resources", () => {
    const result = detectIsolationConflicts([
      { instanceId: "a", webdriverOrCdpPort: 4451, appDataDirectory: "data-a" },
      { instanceId: "b", webdriverOrCdpPort: 4451, appDataDirectory: "data-b" },
    ]);
    expect(result.status).toBe("isolation_blocked");
    expect(result.conflicts[0]?.resource).toBe("webdriverOrCdpPort");
  });

  it("validates declarative matrices and quality dimensions", () => {
    expect(faultMatrixSchema.parse({ strategy: "pairwise", cases: [{ id: "provider-pause", faults: [{ type: "provider_disconnect" }] }] })).toBeTruthy();
    expect(qualityDimensionsSchema.parse({ businessCoverage: "verified", evidenceCompleteness: "partial", faultCoverage: "not_applicable", isolation: "unknown", provenance: "verified" })).toBeTruthy();
  });
});
