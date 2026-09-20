import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@iarna/toml";
import { EvidenceSession, runProcess, correctFailureKind, classifyWdioFailure } from "@client-test/core";
import type { FailureKind, ProjectContext, RunStatus, TestContract } from "@client-test/core";

export async function runTauriSuite(context: ProjectContext, options: { suite?: string; timeoutMs?: number; contract?: TestContract } = {}) {
  const session = await EvidenceSession.create(context, options.contract);
  const packageManager = context.packageManager ?? "pnpm";
  const manifestPath = join(context.projectRoot, "src-tauri", "Cargo.toml");
  const cargo = existsSync(manifestPath) ? parse(readFileSync(manifestPath, "utf8")) as Record<string, any> : {};
  const features = cargo.features as Record<string, unknown> | undefined;
  if (!features || !("client-test" in features)) {
    const message = "Tauri project does not define the client-test feature; run setup in an isolated worktree or use an existing external WebView/CDP test entrypoint";
    session.markNotProduced("build.stdout.log", "client-test feature is not configured");
    session.markNotProduced("build.stderr.log", "client-test feature is not configured");
    session.markNotProduced("stdout.log", "WDIO was not started");
    session.markNotProduced("stderr.log", "WDIO was not started");
    await session.write("setup-required.txt", message);
    const finalized = await session.finalize("error", { adapter: "tauri-2", failureKind: "environment", phase: "preflight", message, manifestPath });
    return {
      status: finalized.status === "interrupted" ? "error" as const : finalized.status,
      failureKind: finalized.failureKind,
      runId: session.runId,
      artifactDirectory: session.directory,
      objectiveSummary: finalized.objectiveSummary,
      evidenceWarnings: finalized.evidenceWarnings,
    };
  }
  const buildArgs = packageManager === "npm"
    ? ["exec", "tauri", "--", "build", "--debug", "--no-bundle", "--features", "client-test"]
    : packageManager === "yarn"
      ? ["tauri", "build", "--debug", "--no-bundle", "--features", "client-test"]
      : packageManager === "bun"
        ? ["x", "tauri", "build", "--debug", "--no-bundle", "--features", "client-test"]
        : ["exec", "tauri", "build", "--debug", "--no-bundle", "--features", "client-test"];
  const buildExecutable = process.platform === "win32" && ["pnpm", "npm", "yarn", "bun"].includes(packageManager) ? `${packageManager}.cmd` : packageManager;
  const build = await runProcess({ executable: buildExecutable, args: buildArgs, cwd: context.projectRoot, env: session.childEnvironment() }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.recordRuntimeInstance({ instanceId: "adapter-runner", binaryPath: buildExecutable, pid: build.pid });
  await session.write("build.stdout.log", build.stdout);
  await session.write("build.stderr.log", build.stderr);
  if (build.spawnError || build.timedOut || build.exitCode !== 0) {
    const status = build.spawnError ? "error" as const : "failed" as const;
    const failureKind = build.spawnError ? "environment" as const : build.timedOut ? "timeout" as const : "build" as const;
    session.markNotProduced("stdout.log", "WDIO was not started because the build failed");
    session.markNotProduced("stderr.log", "WDIO was not started because the build failed");
    const finalized = await session.finalize(status, { failureKind: correctFailureKind({ failureKind, phase: "build", spawnError: build.spawnError, timedOut: build.timedOut }), phase: "build", pid: build.pid, exitCode: build.exitCode, spawnError: build.spawnError, command: { executable: buildExecutable, args: buildArgs } });
    return {
      status: finalized.status === "interrupted" ? "error" as const : finalized.status,
      failureKind: finalized.failureKind ?? failureKind,
      runId: session.runId,
      artifactDirectory: session.directory,
      exitCode: build.exitCode,
      objectiveSummary: finalized.objectiveSummary,
      evidenceWarnings: finalized.evidenceWarnings,
    };
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
  const result = await runProcess({ executable, args, cwd: context.projectRoot, env: session.childEnvironment() }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.recordRuntimeInstance({ instanceId: "adapter-runner", binaryPath: executable, pid: result.pid });
  await session.write("stdout.log", result.stdout);
  await session.write("stderr.log", result.stderr);
  const status: RunStatus = result.spawnError ? "error" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  const failureKind: FailureKind | undefined = result.spawnError ? "environment" : result.timedOut ? "timeout" : result.exitCode === 0 ? undefined : "assertion";
  const correctedFailureKind = classifyWdioFailure({ failureKind, stdout: result.stdout, stderr: result.stderr, spawnError: result.spawnError, timedOut: result.timedOut });
  const cleanupWarning = /Failed to clear mock store|sessionId is required|cleanup/i.test(result.stderr) ? "cleanup_warning" : undefined;
  const finalized = await session.finalize(status, { exitCode: result.exitCode, signal: result.signal, pid: result.pid, timedOut: result.timedOut, spawnError: result.spawnError, failureKind: correctedFailureKind, cleanupWarning, command: { executable, args, cwd: context.projectRoot } });
  return {
    status: finalized.status === "interrupted" ? "error" as const : finalized.status,
    failureKind: finalized.failureKind ?? correctedFailureKind,
    runId: session.runId,
    artifactDirectory: join(session.directory),
    exitCode: result.exitCode,
    objectiveSummary: finalized.objectiveSummary,
    evidenceWarnings: finalized.evidenceWarnings,
  };
}
