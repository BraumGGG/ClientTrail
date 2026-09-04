import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@iarna/toml";
import type { DetectionResult, ProjectContext } from "@client-test/core";

export async function detectTauri(context: ProjectContext): Promise<DetectionResult> {
  const manifest = join(context.projectRoot, "src-tauri", "Cargo.toml");
  if (!existsSync(manifest)) return { adapterId: "tauri-2", detected: false, confidence: 0, evidence: [], capabilities: [] };
  const cargo = parse(readFileSync(manifest, "utf8")) as Record<string, any>;
  const dependencies = { ...(cargo.dependencies ?? {}), ...(cargo["build-dependencies"] ?? {}) };
  const raw = dependencies.tauri;
  const version = typeof raw === "string" ? raw : raw?.version;
  const isV2 = typeof version === "string" && /^(\^|~|>=)?2(?:\.|$)/.test(version);
  return {
    adapterId: "tauri-2",
    detected: isV2,
    confidence: isV2 ? 1 : 0,
    evidence: [manifest, ...(isV2 ? [`tauri=${version}`] : [])],
    capabilities: isV2 ? ["webview", "tauri-command", "multi-window"] : [],
  };
}
