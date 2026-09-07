import { describe, expect, it } from "vitest";
import { correctFailureKind, selectFaultTarget, validateSuiteTier } from "./orchestration.js";

describe("orchestration safeguards", () => {
  const handles = [{ instanceId: "a", pid: 10, webdriverOrCdpPort: 4451, appDataDirectory: "a" }, { instanceId: "b", pid: 20, webdriverOrCdpPort: 4452, appDataDirectory: "b" }];
  it("requires an unambiguous instance fault target", () => { expect(selectFaultTarget(handles, { pid: 20 }).instanceId).toBe("b"); expect(() => selectFaultTarget(handles, {})).toThrow("ambiguous"); });
  it("corrects startup failures away from assertion", () => { expect(correctFailureKind({ failureKind: "assertion", phase: "onPrepare", message: "embedded WebDriver spawn failed" })).toBe("adapter"); });
  it("does not label short repetition as soak", () => { expect(validateSuiteTier("soak", { iterations: 3, durationMs: 1000 }).valid).toBe(false); });
});
