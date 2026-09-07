import { EvidenceSession, parseCommand, runProcess, correctFailureKind } from "@client-test/core";
import type { ProjectContext, RunResult, TestContract } from "@client-test/core";

export type NativeOperation = "snapshot" | "find" | "invoke" | "wait";

export function buildNativeCommand(platform: NodeJS.Platform, operation: NativeOperation, app: string, selector?: string, value?: string): { executable: string; args: string[] } {
  if (platform === "win32") {
    const args = ["ui", operation === "snapshot" ? "inspect" : operation === "find" ? "search" : operation === "invoke" ? "invoke" : "wait-for"];
    if (selector) args.push(selector);
    if (value && operation === "find") args.push(value);
    args.push("-a", app, "--json");
    return { executable: "winapp.exe", args };
  }
  return { executable: "osascript", args: ["-e", `tell application \"System Events\" to get name of every process whose name contains \"${app.replace(/\"/g, "") }\"`] };
}

export async function runNativeOperation(context: ProjectContext, operation: NativeOperation, app: string, selector?: string, value?: string, timeoutMs = 30_000) {
  const command = buildNativeCommand(context.platform, operation, app, selector, value);
  const result = await runProcess({ executable: command.executable, args: command.args, cwd: context.projectRoot }, { timeoutMs, redact: context.config.artifacts.redact });
  return { ...result, command };
}

export async function runNativeSuite(context: ProjectContext, options: { timeoutMs?: number; contract?: TestContract } = {}): Promise<RunResult> {
  const session = await EvidenceSession.create(context, options.contract);
  const configured = context.config.adapters.native;
  const command = configured && typeof configured === "object" && "command" in configured ? configured.command : undefined;
  if (!command) {
    await session.finalize("error", { adapter: "native", failureKind: "environment", message: "No native automation command configured" });
    return { status: "error", failureKind: "environment", runId: session.runId, artifactDirectory: session.directory };
  }
  const result = await runProcess(parseCommand(command, context.projectRoot), { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.write("native.stdout.log", result.stdout);
  await session.write("native.stderr.log", result.stderr);
  const status = result.spawnError ? "error" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  const failureKind = result.spawnError ? "environment" as const : result.timedOut ? "timeout" as const : result.exitCode === 0 ? undefined : "assertion" as const;
  await session.finalize(status, { adapter: "native", pid: result.pid, exitCode: result.exitCode, timedOut: result.timedOut, spawnError: result.spawnError, failureKind: correctFailureKind({ failureKind, phase: "native", message: result.stderr, spawnError: result.spawnError, timedOut: result.timedOut }) });
  return { status, failureKind, runId: session.runId, artifactDirectory: session.directory, exitCode: result.exitCode };
}
