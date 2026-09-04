import { describe, expect, it } from "vitest";
import { ActionRecorder, generateWdioDraft } from "./recording.js";

describe("action recording", () => {
  it("records only while active and generates a WDIO draft", () => {
    const recorder = new ActionRecorder();
    recorder.record({ type: "click", selector: "#ignored" });
    recorder.start();
    recorder.record({ type: "fill", selector: "#name", value: "Codex" });
    recorder.record({ type: "click", selector: "#greet" });
    const actions = recorder.stop();
    expect(actions).toHaveLength(2);
    expect(generateWdioDraft(actions)).toContain("setValue(\"Codex\")");
  });
});
