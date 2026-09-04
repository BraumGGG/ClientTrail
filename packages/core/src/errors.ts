export class CommandNotImplementedError extends Error {
  constructor(command: string) {
    super(`${command} is not implemented yet`);
    this.name = "CommandNotImplementedError";
  }
}

import type { FailureKind } from "./contracts.js";

export function classifyError(error: unknown): FailureKind {
  const value = error as { code?: string; message?: string };
  const code = String(value?.code ?? "").toLowerCase();
  const message = String(value?.message ?? error).toLowerCase();
  if (code === "enoent" || code === "eacces" || /not found|missing|permission|runtime/.test(message)) return "environment";
  if (/timeout|timed out/.test(message)) return "timeout";
  if (/assert|expect|locator|selector/.test(message)) return "assertion";
  if (/build|compile|cargo|typescript/.test(message)) return "build";
  if (/launch|spawn|connect|port/.test(message)) return "launch";
  if (/network|fetch|econn|socket/.test(message)) return "network";
  return "unknown";
}
