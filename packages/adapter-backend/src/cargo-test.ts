import { existsSync } from "node:fs";
import { join } from "node:path";
import { EvidenceSession, runProcess, correctFailureKind } from "@client-test/core";
import type { DetectionResult, ProjectContext, RunResult, TestContract, TestExecutionSummary } from "@client-test/core";

export function detectCargoTest(context: ProjectContext): DetectionResult {
  const manifest = join(context.projectRoot, "Cargo.toml");
  const tauriManifest = join(context.projectRoot, "src-tauri", "Cargo.toml");
  const evidence = [manifest, tauriManifest].filter(existsSync);
  return { adapterId: "cargo-test", detected: evidence.length > 0, confidence: evidence.length > 0 ? 1 : 0, evidence, capabilities: ["json-messages", "unit-tests", "integration-tests", "proptest"] };
}

function summarizeCargoOutput(stdout: string, stderr: string): TestExecutionSummary {
  const text = `${stdout}\n${stderr}`;
  const summary: TestExecutionSummary = {};
  for (const [key, pattern] of [["passed", /test result: ok\. (\d+) passed/gi], ["failed", /test result: .*?(\d+) failed/gi], ["ignored", /test result: .*?(\d+) ignored/gi], ["measured", /test result: .*?(\d+) measured/gi], ["filteredOut", /test result: .*?(\d+) filtered out/gi]] as const) {
    let total = 0;
    for (const match of text.matchAll(pattern)) total += Number(match[1]);
    summary[key] = total;
  }
  summary.warningCount = [...stdout.matchAll(/"level":"warning"/g), ...stderr.matchAll(/warning:/g)].length;
  summary.errorCount = [...stdout.matchAll(/"level":"error"/g), ...stderr.matchAll(/error:/g)].length;
  return summary;
}

export async function runCargoTest(context: ProjectContext, options: { timeoutMs?: number; contract?: TestContract; requestRunId?: string } = {}): Promise<RunResult> {
  const session = await EvidenceSession.create(context, options.contract, { requestRunId: options.requestRunId });
  const manifest = join(context.projectRoot, "Cargo.toml");
  const tauriManifest = join(context.projectRoot, "src-tauri", "Cargo.toml");
  const manifestPath = existsSync(manifest) ? manifest : existsSync(tauriManifest) ? tauriManifest : undefined;
  if (!manifestPath) {
    const message = "No Cargo.toml found in the project root or src-tauri";
    session.markNotProduced("cargo.stdout.jsonl", "no Cargo manifest found");
    await session.write("cargo.stderr.log", message);
    const finalized = await session.finalize("error", { exitCode: null, adapter: "cargo-test", adapterVersion: "0.1.0", failureKind: "environment", message });
    return {
      status: finalized.status === "interrupted" ? "error" : finalized.status,
      adapterId: "cargo-test",
      requestRunId: options.requestRunId,
      failureKind: finalized.failureKind,
      runId: session.runId,
      artifactDirectory: session.directory,
      exitCode: null,
      objectiveSummary: finalized.objectiveSummary,
      evidenceWarnings: finalized.evidenceWarnings,
    };
  }
  const executable = "cargo";
  const result = await runProcess({ executable, args: ["test", "--manifest-path", manifestPath, "--message-format", "json"], cwd: context.projectRoot, env: session.childEnvironment() }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.recordRuntimeInstance({ instanceId: "adapter-runner", processRole: "runner", binaryPath: executable, pid: result.pid, runnerPid: result.pid });
  await session.write("cargo.stdout.jsonl", result.stdout);
  await session.write("cargo.stderr.log", result.stderr);
  const status = result.spawnError ? "error" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  const failureKind = result.spawnError ? "environment" as const : result.timedOut ? "timeout" as const : result.exitCode === 0 ? undefined : "assertion" as const;
  const testSummary = summarizeCargoOutput(result.stdout, result.stderr);
  const finalized = await session.finalize(status, { exitCode: result.exitCode, pid: result.pid, timedOut: result.timedOut, spawnError: result.spawnError, failureKind: correctFailureKind({ failureKind, phase: "cargo", message: result.stderr, spawnError: result.spawnError, timedOut: result.timedOut }), adapter: "cargo-test", adapterVersion: "0.1.0", manifestPath, testSummary });
  return {
    status: finalized.status === "interrupted" ? "error" : finalized.status,
    adapterId: "cargo-test",
    requestRunId: options.requestRunId,
    failureKind: finalized.failureKind ?? failureKind,
    runId: session.runId,
    artifactDirectory: session.directory,
    exitCode: result.exitCode,
    objectiveSummary: finalized.objectiveSummary,
    evidenceWarnings: finalized.evidenceWarnings,
    testSummary,
  };
}
