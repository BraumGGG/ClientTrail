import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProjectContext } from "@client-test/core";
import { createTauriSetupPlan } from "./setup-plan.js";

async function tauriRoot() {
  const root = await mkdtemp(join(tmpdir(), "tauri-setup-"));
  await mkdir(join(root, "src-tauri"));
  await writeFile(join(root, "src-tauri", "Cargo.toml"), "[dependencies]\ntauri = { version = \"2\" }\n");
  await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  return root;
}

describe("Tauri setup plan", () => {
  it("plans files and dependencies without modifying the project", async () => {
    const root = await tauriRoot();
    const plan = await createTauriSetupPlan(await createProjectContext(root));
    expect(plan.filesToCreate).toHaveLength(2);
    expect(plan.dependencies).toContain("@wdio/tauri-service");
    expect(plan.commands[0]?.executable).toBe("pnpm");
  });
});
