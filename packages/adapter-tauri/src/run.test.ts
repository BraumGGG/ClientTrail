import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProjectContext } from "@client-test/core";
import { resolveTauriTimeouts, runTauriSuite } from "./run.js";

describe("Tauri runner", () => {
  it("keeps build and business-test budgets independent", () => {
    expect(resolveTauriTimeouts({})).toEqual({ buildTimeoutMs: 300_000, testTimeoutMs: 120_000 });
    expect(resolveTauriTimeouts({ buildTimeoutMs: 600_000, timeoutMs: 45_000 })).toEqual({ buildTimeoutMs: 600_000, testTimeoutMs: 45_000 });
  });
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
    const context: ProjectContext = {
      projectRoot: root,
      platform: "win32",
      packageManager: "npm",
      files: [],
      config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } },
    };
    const result = await runTauriSuite(context, {
      contract: {
        contractVersion: 1,
        objectives: [{ id: "launch", description: "launch", required: true }],
        preconditions: [],
        requiredCapabilities: [],
        optionalDegradations: [],
        passCriteria: [],
        failCriteria: [],
        blockedCriteria: [],
      },
    });
    expect(result.status).toBe("blocked");
    expect(result.failureKind).toBe("capability_not_configured");
    expect(result.adapterId).toBe("tauri-2");
    const message = await readFile(join(result.artifactDirectory!, "setup-required.txt"), "utf8");
    expect(message).toContain("client-test feature");
    const evidence = JSON.parse(await readFile(join(result.artifactDirectory!, "result.json"), "utf8"));
    expect(evidence.capabilityStatus).toBe("not_configured");
    expect(evidence.setupRequired).toBe(true);
  });
});
