import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectNative } from "./detect.js";
import { runNativeSuite } from "./run.js";

describe("native adapter", () => {
  it("does not enable native automation unless configured", () => {
    const result = detectNative({ projectRoot: process.cwd(), platform: "win32", files: [], config: { version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } } });
    expect(result.detected).toBe(false);
  });

  it("finalizes evidence when the automation command cannot start", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "client-test-native-"));
    const result = await runNativeSuite({
      projectRoot,
      platform: process.platform,
      files: [],
      config: {
        version: 1,
        project: { root: "." },
        adapters: { native: { enabled: true, command: "client-test-command-that-does-not-exist" } },
        artifacts: { directory: ".client-test/artifacts", redact: true },
      },
    });

    expect(result.status).toBe("error");
    expect(result.failureKind).toBe("environment");
    const evidence = JSON.parse(await readFile(join(result.artifactDirectory!, "result.json"), "utf8"));
    expect(evidence.status).toBe("error");
    expect(evidence.spawnError).toContain("client-test-command-that-does-not-exist");
  });
});
