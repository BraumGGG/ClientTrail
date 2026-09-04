import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("config", () => {
  it("returns safe defaults", async () => {
    const root = await mkdtemp(join(tmpdir(), "client-test-"));
    const config = await loadConfig(root);
    expect(config.version).toBe(1);
    expect(config.artifacts.redact).toBe(true);
  });

  it("rejects unsupported schema versions", async () => {
    const root = await mkdtemp(join(tmpdir(), "client-test-"));
    await writeFile(join(root, "client-test.config.yaml"), "version: 2\n");
    await expect(loadConfig(root)).rejects.toThrow();
  });
});
