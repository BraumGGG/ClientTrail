import { describe, expect, it } from "vitest";
import type { ProjectContext } from "@client-test/core";
import { runTauriSuite } from "./run.js";

describe("Tauri runner", () => {
  it("exposes the runner entry point", () => {
    expect(runTauriSuite).toBeTypeOf("function");
  });

  it("accepts a project context contract", () => {
    const context: ProjectContext = { projectRoot: ".", platform: "win32", packageManager: "pnpm", files: [], config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } } };
    expect(context.config.version).toBe(1);
  });
});
