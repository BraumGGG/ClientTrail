import { describe, expect, it } from "vitest";
import { detectNative } from "./detect.js";

describe("native adapter", () => {
  it("does not enable native automation unless configured", () => {
    const result = detectNative({ projectRoot: process.cwd(), platform: "win32", files: [], config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } } });
    expect(result.detected).toBe(false);
  });
});
