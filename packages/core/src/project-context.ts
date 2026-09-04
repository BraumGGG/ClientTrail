import { existsSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { loadConfig } from "./config.js";
import type { ProjectContext } from "./contracts.js";

function detectPackageManager(root: string): ProjectContext["packageManager"] {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  if (existsSync(join(root, "bun.lockb")) || existsSync(join(root, "bun.lock"))) return "bun";
  if (existsSync(join(root, "package-lock.json"))) return "npm";
  return undefined;
}

export async function createProjectContext(projectRoot: string): Promise<ProjectContext> {
  const resolvedRoot = realpathSync(projectRoot);
  return {
    projectRoot: resolvedRoot,
    platform: process.platform,
    packageManager: detectPackageManager(resolvedRoot),
    files: readdirSync(resolvedRoot),
    config: await loadConfig(resolvedRoot),
  };
}

export function isPathInside(root: string, candidate: string): boolean {
  const resolvedRoot = realpathSync(root);
  const resolvedCandidate = existsSync(candidate) ? realpathSync(candidate) : candidate;
  const rel = relative(resolvedRoot, resolvedCandidate);
  return rel === "" || (!rel.startsWith(".." + sep) && rel !== "..");
}
