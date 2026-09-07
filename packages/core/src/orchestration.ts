import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile, copyFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { FailureKind, RunStatus, SuiteTier } from "./contracts.js";

export interface InstanceControlHandle {
  instanceId: string;
  pid?: number;
  applicationId?: string;
  binaryPath?: string;
  webdriverOrCdpPort?: number;
  externalDependencyPorts?: number[];
  appDataDirectory?: string;
  controlDirectory?: string;
  persistentStorePaths?: string[];
  temporaryDirectory?: string;
  cargoTargetDirectory?: string;
  externalDependencyHandles?: Array<{ id: string; pid?: number; port?: number; controlDirectory?: string }>;
}

export function selectFaultTarget(handles: InstanceControlHandle[], target: Partial<InstanceControlHandle> & { instanceId?: string }): InstanceControlHandle {
  const matches = handles.filter((handle) => {
    if (target.instanceId && handle.instanceId !== target.instanceId) return false;
    if (target.pid !== undefined && handle.pid !== target.pid) return false;
    if (target.webdriverOrCdpPort !== undefined && handle.webdriverOrCdpPort !== target.webdriverOrCdpPort) return false;
    if (target.appDataDirectory && handle.appDataDirectory !== target.appDataDirectory) return false;
    if (target.controlDirectory && handle.controlDirectory !== target.controlDirectory) return false;
    return true;
  });
  if (matches.length !== 1) throw new Error(matches.length === 0 ? "fault target not found" : "fault target is ambiguous; provide instanceId, pid, port, appDataDirectory, or controlDirectory");
  return matches[0];
}

export function correctFailureKind(input: { failureKind?: FailureKind; phase?: string; message?: string; spawnError?: string; timedOut?: boolean }): FailureKind | undefined {
  const text = `${input.phase ?? ""} ${input.message ?? ""} ${input.spawnError ?? ""}`.toLowerCase();
  if (input.timedOut) return "timeout";
  if (input.phase && ["onprepare", "launch", "startup", "preflight"].some((p) => input.phase!.toLowerCase().includes(p))) return text.includes("driver") || text.includes("adapter") || text.includes("session") ? "adapter" : "launch";
  if (text.includes("spawn") || text.includes("web driver") || text.includes("webdriver") || text.includes("cdp")) return "adapter";
  return input.failureKind;
}

const minimums: Record<SuiteTier, { iterations: number; durationMs: number }> = {
  smoke: { iterations: 1, durationMs: 0 }, functional: { iterations: 1, durationMs: 0 }, recovery: { iterations: 1, durationMs: 0 }, soak: { iterations: 10, durationMs: 15 * 60_000 }, stress: { iterations: 20, durationMs: 5 * 60_000 }, security: { iterations: 1, durationMs: 0 },
};
export function validateSuiteTier(tier: SuiteTier, metrics: { iterations?: number; durationMs?: number }): { valid: boolean; reason?: string } {
  const required = minimums[tier];
  if ((metrics.iterations ?? 0) < required.iterations) return { valid: false, reason: `${tier} requires at least ${required.iterations} iterations` };
  if ((metrics.durationMs ?? 0) < required.durationMs) return { valid: false, reason: `${tier} requires at least ${required.durationMs}ms duration` };
  return { valid: true };
}

export async function sha256File(path: string): Promise<string> {
  return await new Promise((resolve, reject) => { const hash = createHash("sha256"); const stream = createReadStream(path); stream.on("data", (chunk) => hash.update(chunk)); stream.on("error", reject); stream.on("end", () => resolve(hash.digest("hex"))); });
}

export async function sha256Directory(path: string): Promise<string> {
  const files: string[] = [];
  async function walk(dir: string): Promise<void> { for (const entry of await readdir(dir, { withFileTypes: true })) { const full = join(dir, entry.name); if (entry.isDirectory()) await walk(full); else files.push(full); } }
  await walk(path); files.sort(); const hash = createHash("sha256");
  for (const file of files) { hash.update(relative(path, file)); hash.update(await sha256File(file)); }
  return hash.digest("hex");
}

export async function createMinimalReproPackage(input: { artifactDirectory: string; files?: string[]; contract?: unknown; provenance?: unknown; resources?: unknown; command?: unknown; stateTimeline?: unknown }): Promise<string> {
  const repro = join(input.artifactDirectory, "repro"); await mkdir(repro, { recursive: true });
  const manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), files: input.files ?? [], contract: input.contract, provenance: input.provenance, resources: input.resources, command: input.command, stateTimeline: input.stateTimeline, redaction: "inherited from evidence writer" };
  await writeFile(join(repro, "repro-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  for (const file of input.files ?? []) { try { await stat(file); await copyFile(file, join(repro, file.replace(/[\\/:]/g, "_"))); } catch { /* missing evidence is recorded in manifest */ } }
  return repro;
}
