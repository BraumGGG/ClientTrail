import { existsSync, accessSync, constants } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DoctorCheck, DoctorReport, ProjectContext } from "@client-test/core";
import { detectTauri } from "./detect.js";

const execFileAsync = promisify(execFile);

async function commandVersion(command: string, args: string[]): Promise<string | undefined> {
  try {
    const result = await execFileAsync(command, args, { windowsHide: true });
    return result.stdout.trim() || result.stderr.trim();
  } catch {
    return undefined;
  }
}

export async function runTauriDoctor(context: ProjectContext): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push({ id: "node", status: nodeMajor >= 20 ? "pass" : "fail", message: `Node.js ${process.versions.node}` });
  checks.push({ id: "package-manager", status: context.packageManager ? "pass" : "warn", message: context.packageManager ? `Detected ${context.packageManager}` : "No lockfile detected" });
  const rust = await commandVersion("rustc", ["--version"]);
  checks.push({ id: "rust", status: rust ? "pass" : "fail", message: rust ?? "rustc not found" });
  const cargo = await commandVersion("cargo", ["--version"]);
  checks.push({ id: "cargo", status: cargo ? "pass" : "fail", message: cargo ?? "cargo not found" });
  const tauriCli = await commandVersion("cargo", ["tauri", "--version"]);
  checks.push({ id: "tauri-cli", status: tauriCli ? "pass" : "warn", message: tauriCli ?? "cargo tauri not available" });
  const detection = await detectTauri(context);
  checks.push({ id: "tauri-project", status: detection.detected ? "pass" : "fail", message: detection.detected ? "Tauri 2 project detected" : "Tauri 2 manifest not detected", details: detection.evidence });
  const artifacts = join(context.projectRoot, context.config.artifacts.directory);
  let writable = true;
  try { accessSync(context.projectRoot, constants.W_OK); } catch { writable = false; }
  checks.push({ id: "artifact-directory", status: writable ? "pass" : "fail", message: writable ? `Project is writable; artifacts at ${artifacts}` : "Project root is not writable" });
  return { schemaVersion: 1, projectRoot: context.projectRoot, platform: context.platform, checks, recommendedAdapters: detection.detected ? ["tauri-2"] : [] };
}
