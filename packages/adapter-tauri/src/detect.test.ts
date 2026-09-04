import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProjectContext } from "@client-test/core";
import { detectTauri } from "./detect.js";

describe("Tauri detection", () => {
  it("detects Tauri 2 from Cargo TOML", async () => {
    const root = await mkdtemp(join(tmpdir(), "tauri-"));
    await mkdir(join(root, "src-tauri"));
    await writeFile(join(root, "src-tauri", "Cargo.toml"), "[dependencies]\ntauri = { version = \"2\" }\n");
    const result = await detectTauri(await createProjectContext(root));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBe(1);
  });

  it("rejects Tauri 1", async () => {
    const root = await mkdtemp(join(tmpdir(), "tauri-"));
    await mkdir(join(root, "src-tauri"));
    await writeFile(join(root, "src-tauri", "Cargo.toml"), "[dependencies]\ntauri = \"1\"\n");
    const result = await detectTauri(await createProjectContext(root));
    expect(result.detected).toBe(false);
  });
});
