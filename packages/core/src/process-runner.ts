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
  terminationMethod?: "taskkill" | "process-group" | "child";
}

export function terminateProcessTree(pid: number | undefined, platform = process.platform): "taskkill" | "process-group" | "child" {
  if (!pid) return "child";
  if (platform === "win32") {
    const killer = crossSpawn("taskkill", ["/pid", String(pid), "/t", "/f"], { windowsHide: true, shell: false });
    killer.once("error", () => undefined);
    return "taskkill";
  }
  try {
    process.kill(-pid, "SIGTERM");
    return "process-group";
  } catch {
    try { process.kill(pid, "SIGTERM"); } catch { /* process already exited */ }
    return "child";
  }
}

export function runProcess(spec: CommandSpec, options: { timeoutMs?: number; redact?: boolean } = {}): Promise<ProcessResult> {
  const { timeoutMs = 120_000, redact = true } = options;
  return new Promise((resolve) => {
    const child = crossSpawn(spec.executable, spec.args, {
      cwd: spec.cwd,
      env: spec.env ? { ...process.env, ...spec.env } : process.env,
      windowsHide: true,
      shell: false,
      detached: process.platform !== "win32",
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
    const timer = setTimeout(() => {
      timedOut = true;
      const terminationMethod = terminateProcessTree(child.pid);
      if (terminationMethod === "taskkill") {
        setTimeout(() => { if (!settled) child.kill(); }, 250);
      } else if (terminationMethod === "child") {
        child.kill();
      }
      termination = terminationMethod;
    }, timeoutMs);
    let termination: ProcessResult["terminationMethod"];
    child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      finish({ exitCode: null, signal: null, stdout, stderr: stderr || message, timedOut: false, spawnError: message });
    });
    child.once("close", (exitCode, signal) => {
      finish({ exitCode, signal, stdout, stderr, timedOut, terminationMethod: termination });
    });
  });
}
