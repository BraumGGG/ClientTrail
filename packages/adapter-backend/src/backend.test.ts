import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProjectContext } from "@client-test/core";
import { detectCargoTest } from "./cargo-test.js";
import { detectPytest } from "./pytest.js";

const context = (root: string): ProjectContext => ({ projectRoot: root, platform: process.platform, files: [], config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } } });

describe("backend adapters", () => {
  it("exposes deterministic adapter ids", () => {
    expect(detectPytest(context(process.cwd())).adapterId).toBe("pytest");
    expect(detectCargoTest(context(process.cwd())).adapterId).toBe("cargo-test");
  });

  it("uses a nested Tauri manifest when running cargo tests", async () => {
    const root = await mkdtemp(join(tmpdir(), "cargo-nested-"));
    await mkdir(join(root, "src-tauri", "src"), { recursive: true });
    await writeFile(join(root, "src-tauri", "Cargo.toml"), "[package]\nname=\"nested\"\nversion=\"0.1.0\"\nedition=\"2021\"\n");
    await writeFile(join(root, "src-tauri", "src", "lib.rs"), "#[test]\nfn smoke() { assert!(true); }\n");
    const result = await (await import("./cargo-test.js")).runCargoTest(context(root), { timeoutMs: 120_000 });
    expect(result.status).toBe("passed");
    const evidence = JSON.parse(await readFile(join(result.artifactDirectory!, "result.json"), "utf8"));
    expect(evidence.manifestPath).toBe(join(root, "src-tauri", "Cargo.toml"));
  }, 30_000);
});
