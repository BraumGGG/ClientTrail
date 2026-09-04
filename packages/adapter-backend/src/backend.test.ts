import { describe, expect, it } from "vitest";
import type { ProjectContext } from "@client-test/core";
import { detectCargoTest } from "./cargo-test.js";
import { detectPytest } from "./pytest.js";

const context = (root: string): ProjectContext => ({ projectRoot: root, platform: process.platform, files: [], config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } } });

describe("backend adapters", () => {
  it("exposes deterministic adapter ids", () => {
    expect(detectPytest(context(process.cwd())).adapterId).toBe("pytest");
    expect(detectCargoTest(context(process.cwd())).adapterId).toBe("cargo-test");
  });
});
