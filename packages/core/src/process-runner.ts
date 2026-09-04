import { spawn } from "node:child_process";
import type { CommandSpec } from "./contracts.js";
import { redactText } from "./redaction.js";

export interface ProcessResult { exitCode: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string; timedOut: boolean; }

export function runProcess(spec: CommandSpec, options: { timeoutMs?: number; redact?: boolean } = {}): Promise<ProcessResult> {
  const { timeoutMs = 120_000, redact = true } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(spec.executable, spec.args, { cwd: spec.cwd, windowsHide: true, shell: false });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ exitCode, signal, stdout: redact ? redactText(stdout) : stdout, stderr: redact ? redactText(stderr) : stderr, timedOut });
    });
  });
}
