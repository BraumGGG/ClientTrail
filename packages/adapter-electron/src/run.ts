import { join } from "node:path";
import { EvidenceSession, runProcess } from "@client-test/core";
import type { ProjectContext, RunResult, TestContract } from "@client-test/core";

export async function runElectronSuite(context: ProjectContext, options: { timeoutMs?: number; contract?: TestContract } = {}): Promise<RunResult> {
  const session = await EvidenceSession.create(context, options.contract);
  const packageManager = context.packageManager ?? "pnpm";
  const args = packageManager === "npm" ? ["exec", "playwright", "--", "test"] : packageManager === "yarn" ? ["playwright", "test"] : packageManager === "bun" ? ["x", "playwright", "test"] : ["exec", "playwright", "test"];
  const executable = process.platform === "win32" ? `${packageManager}.cmd` : packageManager;
  const result = await runProcess({ executable, args, cwd: context.projectRoot }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.write("electron.stdout.log", result.stdout);
  await session.write("electron.stderr.log", result.stderr);
  const status = result.spawnError ? "error" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  const failureKind = result.spawnError ? "environment" as const : result.timedOut ? "timeout" as const : result.exitCode === 0 ? undefined : "assertion" as const;
  await session.finalize(status, { adapter: "electron", command: { executable, args }, exitCode: result.exitCode, timedOut: result.timedOut, spawnError: result.spawnError, failureKind });
  return { status, runId: session.runId, artifactDirectory: join(session.directory), exitCode: result.exitCode, failureKind };
}
