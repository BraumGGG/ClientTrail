import { describe, expect, it } from "vitest";
import { actionRecorder, startRecording, stopRecording } from "./tools.js";

describe("MCP recording tools", () => {
  it("generates a draft that requires validation", () => {
    startRecording();
    actionRecorder.record({ type: "click", selector: "#save" });
    const result = stopRecording();
    expect(result.requiresValidation).toBe(true);
    expect(result.draft).toContain("#save");
  });
});
