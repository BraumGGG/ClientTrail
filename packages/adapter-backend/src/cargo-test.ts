import { existsSync } from "node:fs";
import { join } from "node:path";
import { EvidenceSession, runProcess } from "@client-test/core";
import type { DetectionResult, ProjectContext, RunResult } from "@client-test/core";

export function detectCargoTest(context: ProjectContext): DetectionResult {
  const manifest = join(context.projectRoot, "Cargo.toml");
  const tauriManifest = join(context.projectRoot, "src-tauri", "Cargo.toml");
  const evidence = [manifest, tauriManifest].filter(existsSync);
  return { adapterId: "cargo-test", detected: evidence.length > 0, confidence: evidence.length > 0 ? 1 : 0, evidence, capabilities: ["json-messages", "unit-tests", "integration-tests", "proptest"] };
}

export async function runCargoTest(context: ProjectContext, options: { timeoutMs?: number } = {}): Promise<RunResult> {
  const session = await EvidenceSession.create(context);
  const result = await runProcess({ executable: "cargo", args: ["test", "--message-format", "json"], cwd: context.projectRoot }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.write("cargo.stdout.jsonl", result.stdout);
  await session.write("cargo.stderr.log", result.stderr);
  const status = result.spawnError ? "error" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  const failureKind = result.spawnError ? "environment" as const : result.timedOut ? "timeout" as const : result.exitCode === 0 ? undefined : "assertion" as const;
  await session.finalize(status, { exitCode: result.exitCode, timedOut: result.timedOut, spawnError: result.spawnError, failureKind, adapter: "cargo-test" });
  return { status, runId: session.runId, artifactDirectory: session.directory, exitCode: result.exitCode, failureKind };
}
