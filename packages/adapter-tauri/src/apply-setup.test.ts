import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createProjectContext } from "@client-test/core";
import { applyTauriSetupPlan } from "./apply-setup.js";
import { createTauriSetupPlan } from "./setup-plan.js";

describe("Tauri setup application", () => {
  it("creates files once and refuses to overwrite them", async () => {
    const root = await mkdtemp(join(tmpdir(), "tauri-apply-"));
    mkdirSync(join(root, "src-tauri"));
    await writeFile(join(root, "src-tauri", "Cargo.toml"), "[dependencies]\ntauri = { version = \"2\" }\n");
    const context = await createProjectContext(root);
    const plan = await createTauriSetupPlan(context);
    const result = await applyTauriSetupPlan(context, plan);
    expect(result.changedFiles).toHaveLength(3);
    expect(existsSync(join(root, "wdio.conf.ts"))).toBe(true);
    const secondPlan = await createTauriSetupPlan(await createProjectContext(root));
    expect(secondPlan.filesToCreate).toEqual([]);
    const secondResult = await applyTauriSetupPlan(await createProjectContext(root), secondPlan);
    expect(secondResult.changedFiles).toEqual([]);
    expect(readFileSync(join(root, "wdio.conf.ts"), "utf8")).toContain("appBinaryPath");
    expect(readFileSync(join(root, "src-tauri", "Cargo.toml"), "utf8")).toContain("tauri-plugin-wdio-webdriver");
  });

  it("injects test-only plugins into a main.rs Tauri builder", async () => {
    const root = await mkdtemp(join(tmpdir(), "tauri-main-apply-"));
    mkdirSync(join(root, "src-tauri", "src"), { recursive: true });
    await writeFile(join(root, "package.json"), "{\"name\":\"main-only\"}\n");
    await writeFile(join(root, "src-tauri", "Cargo.toml"), "[package]\nname = \"main-only\"\n[dependencies]\ntauri = { version = \"2\" }\n");
    await writeFile(join(root, "src-tauri", "src", "main.rs"), "fn main() {\n    let app = tauri::Builder::default()\n        .build(tauri::generate_context!())\n        .unwrap();\n    app.run(|_, _| {});\n}\n");

    const context = await createProjectContext(root);
    const plan = await createTauriSetupPlan(context);
    expect(plan.filesToModify).toContain(join(root, "src-tauri", "src", "main.rs"));
    await applyTauriSetupPlan(context, plan);

    const main = readFileSync(join(root, "src-tauri", "src", "main.rs"), "utf8");
    expect(main).toContain("#[cfg(feature = \"client-test\")]");
    expect(main).toContain("tauri_plugin_wdio::init()");
    expect(main).toContain("let app = builder");
  });
});
