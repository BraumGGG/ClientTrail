import crossSpawn from "cross-spawn";
import type { CommandSpec } from "./contracts.js";
import { redactText } from "./redaction.js";

export interface ProcessResult {
  pid?: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError?: string;
}

export function runProcess(spec: CommandSpec, options: { timeoutMs?: number; redact?: boolean } = {}): Promise<ProcessResult> {
  const { timeoutMs = 120_000, redact = true } = options;
  return new Promise((resolve) => {
    const child = crossSpawn(spec.executable, spec.args, {
      cwd: spec.cwd,
      env: spec.env ? { ...process.env, ...spec.env } : process.env,
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const finish = (result: ProcessResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        pid: child.pid,
        ...result,
        stdout: redact ? redactText(result.stdout) : result.stdout,
        stderr: redact ? redactText(result.stderr) : result.stderr,
      });
    };
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      finish({ exitCode: null, signal: null, stdout, stderr: stderr || message, timedOut: false, spawnError: message });
    });
    child.once("close", (exitCode, signal) => {
      finish({ exitCode, signal, stdout, stderr, timedOut });
    });
  });
}
