import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DetectionResult, ProjectContext } from "@client-test/core";

export function detectElectron(context: ProjectContext): DetectionResult {
  const packagePath = join(context.projectRoot, "package.json");
  if (!existsSync(packagePath)) return { adapterId: "electron", detected: false, confidence: 0, evidence: [], capabilities: [] };
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as Record<string, any>;
  const allDependencies = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}), ...(packageJson.optionalDependencies ?? {}) };
  const detected = Boolean(allDependencies.electron);
  return { adapterId: "electron", detected, confidence: detected ? 1 : 0, evidence: detected ? [packagePath, `electron=${allDependencies.electron}`] : [], capabilities: detected ? ["renderer-dom", "main-process", "screenshots", "tracing"] : [] };
}

export function electronRuntimeAvailable(context: ProjectContext): boolean {
  const packagePath = join(context.projectRoot, "node_modules", "electron");
  return existsSync(join(packagePath, "dist", process.platform === "win32" ? "electron.exe" : process.platform === "darwin" ? "Electron.app" : "electron"));
}
