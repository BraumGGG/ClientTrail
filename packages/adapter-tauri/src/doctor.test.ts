import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProjectContext } from "@client-test/core";
import { runTauriDoctor } from "./doctor.js";

describe("Tauri capability report", () => {
  it("exposes capability status and reasons", async () => {
    const root = await mkdtemp(join(tmpdir(), "tauri-doctor-"));
    await mkdir(join(root, "src-tauri"), { recursive: true });
    await writeFile(join(root, "src-tauri", "Cargo.toml"), "[dependencies]\ntauri = { version = \"2\" }\n");
    const report = await runTauriDoctor(await createProjectContext(root));
    expect(report.capabilities?.webview.status).toBe("available");
    expect(report.capabilities?.faultInjection.status).toBe("not_configured");
    expect(report.capabilities?.faultInjection.reason).toContain("instance-level");
  });
});
