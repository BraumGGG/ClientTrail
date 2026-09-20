import { join } from "node:path";
import { EvidenceSession, runProcess, correctFailureKind } from "@client-test/core";
import type { ProjectContext, RunResult, TestContract } from "@client-test/core";

export async function runElectronSuite(context: ProjectContext, options: { timeoutMs?: number; contract?: TestContract } = {}): Promise<RunResult> {
  const session = await EvidenceSession.create(context, options.contract);
  const packageManager = context.packageManager ?? "pnpm";
  const args = packageManager === "npm" ? ["exec", "playwright", "--", "test"] : packageManager === "yarn" ? ["playwright", "test"] : packageManager === "bun" ? ["x", "playwright", "test"] : ["exec", "playwright", "test"];
  const executable = process.platform === "win32" ? `${packageManager}.cmd` : packageManager;
  const result = await runProcess({ executable, args, cwd: context.projectRoot, env: session.childEnvironment() }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.recordRuntimeInstance({ instanceId: "adapter-runner", binaryPath: executable, pid: result.pid });
  await session.write("electron.stdout.log", result.stdout);
  await session.write("electron.stderr.log", result.stderr);
  const status = result.spawnError ? "error" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  const failureKind = result.spawnError ? "environment" as const : result.timedOut ? "timeout" as const : result.exitCode === 0 ? undefined : "assertion" as const;
  const finalized = await session.finalize(status, { adapter: "electron", command: { executable, args }, pid: result.pid, exitCode: result.exitCode, timedOut: result.timedOut, spawnError: result.spawnError, failureKind: correctFailureKind({ failureKind, phase: "playwright", message: result.stderr, spawnError: result.spawnError, timedOut: result.timedOut }) });
  return {
    status: finalized.status === "interrupted" ? "error" : finalized.status,
    failureKind: finalized.failureKind ?? failureKind,
    runId: session.runId,
    artifactDirectory: join(session.directory),
    exitCode: result.exitCode,
    objectiveSummary: finalized.objectiveSummary,
    evidenceWarnings: finalized.evidenceWarnings,
  };
}
