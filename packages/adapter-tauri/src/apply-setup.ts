import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse, stringify } from "@iarna/toml";
import { isPathInside } from "@client-test/core";
import type { ProjectContext, SetupPlan } from "@client-test/core";

function wdioConfig(binaryName: string): string {
  return `import type { Options } from "@wdio/types";
import { join } from "node:path";

export const config: Options.Testrunner = {
  runner: "local",
  framework: "mocha",
  specs: ["./tests/e2e/**/*.e2e.ts"],
  reporters: ["spec"],
  maxInstances: 1,
  hostname: "localhost",
  port: 4445,
  capabilities: [{}],
  services: [["@wdio/tauri-service", {
    driverProvider: "embedded",
    appBinaryPath: join(process.cwd(), "src-tauri", "target", "debug", process.platform === "win32" ? "${binaryName}.exe" : "${binaryName}"),
    pluginConfig: { start: true, build: false },
  }]],
  mochaOpts: { timeout: 120000 },
};
`;
}

const SMOKE_TEST = `describe("Tauri smoke", () => {
  it("boots the application", async () => {
    await expect(browser).toBeDefined();
  });
});
`;

export async function applyTauriSetupPlan(context: ProjectContext, plan: SetupPlan): Promise<{ changedFiles: string[] }> {
  if (plan.productionRisk === "blocked") throw new Error("Cannot set up Tauri testing: Tauri 2 was not detected");
  const cargoPath = join(context.projectRoot, "src-tauri", "Cargo.toml");
  const cargoText = await readFile(cargoPath, "utf8");
  const cargo = parse(cargoText) as Record<string, any>;
  const binaryName = String(cargo.package?.name ?? "app").replace(/-/g, "_");
  const files = new Map<string, string>([
    [join(context.projectRoot, "wdio.conf.ts"), wdioConfig(binaryName)],
    [join(context.projectRoot, "tests", "e2e", "smoke.e2e.ts"), SMOKE_TEST],
  ]);
  const changedFiles: string[] = [];
  for (const file of plan.filesToCreate) {
    if (!isPathInside(context.projectRoot, file)) throw new Error(`Setup path escapes project root: ${file}`);
    const content = files.get(file);
    if (content === undefined) throw new Error(`No generated content for setup file: ${file}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content, { flag: "wx" });
    changedFiles.push(file);
  }
  if (plan.filesToModify.includes(cargoPath)) {
    const features = (cargo.features ??= {});
    const clientTest = (features["client-test"] ??= []);
    if (!clientTest.includes("dep:tauri-plugin-wdio")) clientTest.push("dep:tauri-plugin-wdio");
    if (!clientTest.includes("dep:tauri-plugin-wdio-webdriver")) clientTest.push("dep:tauri-plugin-wdio-webdriver");
    cargo.dependencies ??= {};
    cargo.dependencies["tauri-plugin-wdio"] ??= { version: "1.3.0", optional: true };
    cargo.dependencies["tauri-plugin-wdio-webdriver"] ??= { version: "1.3.0", optional: true };
    const next = stringify(cargo as any);
    if (next !== cargoText) {
      await writeFile(cargoPath, next, "utf8");
      changedFiles.push(cargoPath);
    }
  }
  return { changedFiles };
}
