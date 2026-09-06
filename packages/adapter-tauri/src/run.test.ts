import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("blocks before build when client-test is not configured", async () => {
    const root = await mkdtemp(join(tmpdir(), "tauri-run-preflight-"));
    await mkdir(join(root, "src-tauri"), { recursive: true });
    await writeFile(join(root, "src-tauri", "Cargo.toml"), "[package]\nname=\"demo\"\n[dependencies]\ntauri=\"2\"\n");
    const result = await runTauriSuite({
      projectRoot: root,
      platform: "win32",
      packageManager: "npm",
      files: [],
      config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } },
    });
    expect(result.status).toBe("error");
    expect(result.failureKind).toBe("environment");
    const message = await readFile(join(result.artifactDirectory!, "setup-required.txt"), "utf8");
    expect(message).toContain("client-test feature");
  });
});
