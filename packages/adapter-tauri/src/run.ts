import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@iarna/toml";
import { EvidenceSession, runProcess, correctFailureKind } from "@client-test/core";
import type { FailureKind, ProjectContext, RunStatus, TestContract } from "@client-test/core";

export async function runTauriSuite(context: ProjectContext, options: { suite?: string; timeoutMs?: number; contract?: TestContract } = {}) {
  const session = await EvidenceSession.create(context, options.contract);
  const packageManager = context.packageManager ?? "pnpm";
  const manifestPath = join(context.projectRoot, "src-tauri", "Cargo.toml");
  const cargo = existsSync(manifestPath) ? parse(readFileSync(manifestPath, "utf8")) as Record<string, any> : {};
  const features = cargo.features as Record<string, unknown> | undefined;
  if (!features || !("client-test" in features)) {
    const message = "Tauri project does not define the client-test feature; run setup in an isolated worktree or use an existing external WebView/CDP test entrypoint";
    await session.write("setup-required.txt", message);
    await session.finalize("error", { adapter: "tauri-2", failureKind: "environment", phase: "preflight", message, manifestPath });
    return { status: "error" as const, runId: session.runId, artifactDirectory: session.directory, failureKind: "environment" as const };
  }
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
  if (build.spawnError || build.timedOut || build.exitCode !== 0) {
    const status = build.spawnError ? "error" as const : "failed" as const;
    const failureKind = build.spawnError ? "environment" as const : build.timedOut ? "timeout" as const : "build" as const;
    await session.finalize(status, { failureKind: correctFailureKind({ failureKind, phase: "build", spawnError: build.spawnError, timedOut: build.timedOut }), phase: "build", pid: build.pid, exitCode: build.exitCode, spawnError: build.spawnError, command: { executable: buildExecutable, args: buildArgs } });
    return { status, runId: session.runId, artifactDirectory: session.directory, failureKind, exitCode: build.exitCode };
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
  const status: RunStatus = result.spawnError ? "error" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  const failureKind: FailureKind | undefined = result.spawnError ? "environment" : result.timedOut ? "timeout" : result.exitCode === 0 ? undefined : "assertion";
  await session.finalize(status, { exitCode: result.exitCode, signal: result.signal, pid: result.pid, timedOut: result.timedOut, spawnError: result.spawnError, failureKind: correctFailureKind({ failureKind, phase: "wdio", message: result.stderr, spawnError: result.spawnError, timedOut: result.timedOut }), command: { executable: packageManager, args, cwd: context.projectRoot } });
  return { status, runId: session.runId, artifactDirectory: join(session.directory), failureKind, exitCode: result.exitCode };
}
