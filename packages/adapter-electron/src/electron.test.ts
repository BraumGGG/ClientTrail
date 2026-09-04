import { describe, expect, it } from "vitest";
import { detectElectron, electronRuntimeAvailable } from "./detect.js";

describe("Electron adapter", () => {
  it("does not detect Electron without a package manifest", () => {
    const result = detectElectron({ projectRoot: "Z:/missing", platform: "win32", files: [], config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } } });
    expect(result.detected).toBe(false);
  });

  it("returns a boolean runtime capability", () => {
    const result = electronRuntimeAvailable({ projectRoot: "Z:/missing", platform: "win32", files: [], config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } } });
    expect(typeof result).toBe("boolean");
  });
});
