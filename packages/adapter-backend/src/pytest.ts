import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EvidenceSession, runProcess } from "@client-test/core";
import type { DetectionResult, ProjectContext, RunResult } from "@client-test/core";

export function detectPytest(context: ProjectContext): DetectionResult {
  const evidence = ["pyproject.toml", "pytest.ini", "tox.ini", "setup.cfg"].filter((file) => existsSync(join(context.projectRoot, file)));
  const hasPythonTests = (directory: string): boolean => {
    if (!existsSync(directory)) return false;
    return readdirSync(directory, { withFileTypes: true }).some((entry) => entry.isDirectory()
      ? !["node_modules", ".git", "target"].includes(entry.name) && hasPythonTests(join(directory, entry.name))
      : entry.name.endsWith(".py") && (entry.name.startsWith("test_") || entry.name.endsWith("_test.py")));
  };
  const tests = hasPythonTests(join(context.projectRoot, "tests"));
  return { adapterId: "pytest", detected: evidence.length > 0 || tests, confidence: evidence.length > 0 ? 1 : tests ? 0.6 : 0, evidence, capabilities: ["junit-xml", "fixtures", "hypothesis"] };
}

export async function runPytest(context: ProjectContext, options: { timeoutMs?: number } = {}): Promise<RunResult> {
  const session = await EvidenceSession.create(context);
  const result = await runProcess({ executable: process.platform === "win32" ? "python.exe" : "python3", args: ["-m", "pytest", "--junitxml", join(session.directory, "pytest.xml")], cwd: context.projectRoot }, { timeoutMs: options.timeoutMs, redact: context.config.artifacts.redact });
  await session.write("pytest.stdout.log", result.stdout);
  await session.write("pytest.stderr.log", result.stderr);
  const status = result.spawnError ? "error" : result.timedOut ? "failed" : result.exitCode === 0 ? "passed" : "failed";
  const failureKind = result.spawnError ? "environment" as const : result.timedOut ? "timeout" as const : result.exitCode === 0 ? undefined : "assertion" as const;
  await session.finalize(status, { exitCode: result.exitCode, timedOut: result.timedOut, spawnError: result.spawnError, failureKind, adapter: "pytest" });
  return { status, runId: session.runId, artifactDirectory: session.directory, exitCode: result.exitCode, failureKind };
}
