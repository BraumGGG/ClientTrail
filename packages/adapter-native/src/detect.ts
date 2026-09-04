import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DetectionResult, ProjectContext } from "@client-test/core";

export function detectNative(context: ProjectContext): DetectionResult {
  const configured = Boolean(context.config.adapters.native?.enabled);
  const platform = context.platform === "win32" ? "windows-uia" : context.platform === "darwin" ? "macos-ax" : "unsupported";
  const evidence = existsSync(join(context.projectRoot, "client-test.native.yaml")) ? [join(context.projectRoot, "client-test.native.yaml")] : [];
  return { adapterId: platform, detected: configured && platform !== "unsupported", confidence: configured && platform !== "unsupported" ? 1 : 0, evidence, capabilities: platform === "windows-uia" ? ["accessibility-tree", "invoke", "set-value", "wait"] : platform === "macos-ax" ? ["accessibility-tree", "actions", "notifications"] : [] };
}
