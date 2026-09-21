import { describe, expect, it } from "vitest";
import { classifyBusinessResponse, classifyWdioFailure, correctFailureKind, selectFaultTarget, summarizeRunnerFailureSignals, validateSuiteTier } from "./orchestration.js";

describe("orchestration safeguards", () => {
  const handles = [{ instanceId: "a", pid: 10, webdriverOrCdpPort: 4451, appDataDirectory: "a" }, { instanceId: "b", pid: 20, webdriverOrCdpPort: 4452, appDataDirectory: "b" }];
  it("requires an unambiguous instance fault target", () => { expect(selectFaultTarget(handles, { pid: 20 }).instanceId).toBe("b"); expect(() => selectFaultTarget(handles, {})).toThrow("ambiguous"); });
  it("corrects startup failures away from assertion", () => { expect(correctFailureKind({ failureKind: "assertion", phase: "onPrepare", message: "embedded WebDriver spawn failed" })).toBe("adapter"); });
  it("keeps a business assertion after a session has started", () => {
    expect(classifyWdioFailure({ failureKind: "assertion", stdout: "Initiate new session\n3 passing\n1 failing", stderr: "webdriver stack\nAssertionError: expected PENDING to be ACCEPTED" })).toBe("assertion");
  });
  it("summarizes the first fatal runner signal without proposing a retry", () => {
    const summary = summarizeRunnerFailureSignals({
      stderr: "[appA] Script execution timed out\nconnect ECONNREFUSED 127.0.0.1:4451\nWebDriver channel closed",
      timedOut: true,
      signal: "SIGTERM",
    });
    expect(summary).toEqual({
      firstFatalLine: "[appA] Script execution timed out",
      affectedInstances: ["appA"],
      scriptExecutionTimedOut: true,
      connectionRefused: true,
      channelClosed: true,
      runnerTimedOut: true,
      signal: "SIGTERM",
    });
  });
  it("does not label short repetition as soak", () => { expect(validateSuiteTier("soak", { iterations: 3, durationMs: 1000 }).valid).toBe(false); });
  it("separates expected and blocked business responses", () => {
    expect(classifyBusinessResponse({ status: 409, expectedStatuses: [409] })).toBe("expected_business_response");
    expect(classifyBusinessResponse({ status: 409, blocked: true })).toBe("business_blocked");
  });
});
