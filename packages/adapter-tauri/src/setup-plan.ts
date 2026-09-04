import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ProjectContext, SetupPlan } from "@client-test/core";
import { detectTauri } from "./detect.js";

export async function createTauriSetupPlan(context: ProjectContext): Promise<SetupPlan> {
  const detection = await detectTauri(context);
  if (!detection.detected) {
    return {
      projectRoot: context.projectRoot,
      dependencies: [],
      filesToCreate: [],
      filesToModify: [],
      commands: [],
      productionRisk: "blocked",
    };
  }

  const wdioConfig = join(context.projectRoot, "wdio.conf.ts");
  const smokeTest = join(context.projectRoot, "tests", "e2e", "smoke.e2e.ts");
  const packageJson = join(context.projectRoot, "package.json");
  const cargoToml = join(context.projectRoot, "src-tauri", "Cargo.toml");
  const tauriMain = join(context.projectRoot, "src-tauri", "src", "main.rs");
  const tauriLib = join(context.projectRoot, "src-tauri", "src", "lib.rs");
  const capabilities = join(context.projectRoot, "src-tauri", "capabilities", "default.json");
  const frontendEntry = join(context.projectRoot, "src", "main.ts");
  const dependencies = ["@wdio/cli", "@wdio/local-runner", "@wdio/mocha-framework", "@wdio/spec-reporter", "@wdio/types", "@wdio/tauri-service", "@wdio/tauri-plugin"];
  const executable = context.packageManager ?? "pnpm";
  const installArgs = executable === "npm" ? ["install", "--save-dev", ...dependencies] : executable === "yarn" ? ["add", "--dev", ...dependencies] : executable === "bun" ? ["add", "--dev", ...dependencies] : ["add", "-D", ...dependencies];
  return {
    projectRoot: context.projectRoot,
    dependencies: dependencies.filter((dependency) => !existsSync(join(context.projectRoot, "node_modules", dependency))),
    filesToCreate: [wdioConfig, smokeTest].filter((file) => !existsSync(file)),
    filesToModify: [packageJson, cargoToml, tauriMain, tauriLib, capabilities, frontendEntry].filter((file) => existsSync(file)),
    commands: [{ executable, args: installArgs, cwd: context.projectRoot }],
    productionRisk: "warning",
  };
}
