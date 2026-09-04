import { join } from "node:path";
import { EvidenceSession, runProcess } from "@client-test/core";
import type { FailureKind, ProjectContext, RunStatus } from "@client-test/core";

export async function runTauriSuite(context: ProjectContext, options: { suite?: string; timeoutMs?: number } = {}) {
  const session = await EvidenceSession.create(context);
  const packageManager = context.packageManager ?? "pnpm";
  const buildArgs = packageManager === "npm"
    ? ["exec", "tauri", "--", "build", "--debug", "--no-bundle", "--features", "client-test"]
    : packageManager === "yarn"
      ? ["tauri", "build", "--debug", "--no-bundle", "--features", "client-test"]
      : packageManager === "bun"
        ? ["x", "tauri", "build", "--debug", "--no-bundle", "--features", "client-test"]
        : ["exec", "tauri", "build", "--debug", "--no-bundle", "--features", "client-test"];
  const buildExecutable = process.platform === "win32" && ["pnpm", "npm", "yarn", "bun"].includes(packageManager) ? `${packageManager}.cmd` : packageManager;
  const build = await runProcess({ executable: buildExecutable, args: buildArgs, cwd: context.projectRoot }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.write("build.stdout.log", build.stdout);
  await session.write("build.stderr.log", build.stderr);
  if (build.timedOut || build.exitCode !== 0) {
    await session.finalize("failed", { failureKind: build.timedOut ? "timeout" : "build", phase: "build", exitCode: build.exitCode, command: { executable: buildExecutable, args: buildArgs } });
    return { status: "failed" as const, runId: session.runId, artifactDirectory: session.directory, failureKind: build.timedOut ? "timeout" as const : "build" as const, exitCode: build.exitCode };
  }
  const args = packageManager === "npm"
    ? ["exec", "wdio", "--", "run", "wdio.conf.ts"]
    : packageManager === "yarn"
      ? ["wdio", "run", "wdio.conf.ts"]
      : packageManager === "bun"
        ? ["x", "wdio", "run", "wdio.conf.ts"]
        : ["exec", "wdio", "run", "wdio.conf.ts"];
  if (options.suite) args.push("--suite", options.suite);
  const executable = buildExecutable;
  const result = await runProcess({ executable, args, cwd: context.projectRoot }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.write("stdout.log", result.stdout);
  await session.write("stderr.log", result.stderr);
  const status: RunStatus = result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  await session.finalize(status, { exitCode: result.exitCode, signal: result.signal, timedOut: result.timedOut, command: { executable: packageManager, args, cwd: context.projectRoot } });
  const failureKind: FailureKind | undefined = result.timedOut ? "timeout" : result.exitCode === 0 ? undefined : "assertion";
  return { status, runId: session.runId, artifactDirectory: join(session.directory), failureKind, exitCode: result.exitCode };
}
