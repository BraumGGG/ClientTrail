import { z } from "zod";

export const exitCodes = {
  success: 0,
  configuration: 2,
  testFailure: 3,
  internal: 4,
} as const;

export const commandSpecSchema = z.object({
  executable: z.string().min(1),
  args: z.array(z.string()),
  cwd: z.string().min(1),
});

export const setupPlanSchema = z.object({
  projectRoot: z.string().min(1),
  dependencies: z.array(z.string()),
  filesToCreate: z.array(z.string()),
  filesToModify: z.array(z.string()),
  commands: z.array(commandSpecSchema),
  productionRisk: z.enum(["none", "warning", "blocked"]),
});

export type CommandSpec = z.infer<typeof commandSpecSchema>;
export type SetupPlan = z.infer<typeof setupPlanSchema>;
export type FailureKind =
  | "environment" | "build" | "launch" | "locator" | "timeout"
  | "assertion" | "backend" | "network" | "crash" | "security" | "unknown";
export type RunStatus = "passed" | "failed" | "error";
export interface RunResult {
  status: RunStatus;
  failureKind?: FailureKind;
  runId?: string;
  artifactDirectory?: string;
  exitCode?: number | null;
}

export interface ProjectContext {
  projectRoot: string;
  platform: NodeJS.Platform;
  packageManager?: "pnpm" | "npm" | "yarn" | "bun";
  files: string[];
  config: ClientTestConfig;
}

export interface ClientTestConfig {
  version: 1;
  project: { kind?: string; root: string; appCommand?: string; webviewEndpoint?: string };
  adapters: Record<string, { enabled: boolean | "auto"; command?: string | { executable: string; args?: string[] } }>;
  artifacts: { directory: string; redact: boolean };
}

export interface DetectionResult {
  adapterId: string;
  detected: boolean;
  confidence: number;
  evidence: string[];
  capabilities: string[];
}

export interface DoctorCheck { id: string; status: "pass" | "warn" | "fail"; message: string; details?: unknown; }
export interface DoctorReport {
  schemaVersion: 1;
  projectRoot: string;
  platform: NodeJS.Platform;
  checks: DoctorCheck[];
  recommendedAdapters: string[];
}

export interface TestAdapter {
  readonly id: string;
  detect(context: ProjectContext): Promise<DetectionResult>;
  doctor(context: ProjectContext): Promise<DoctorReport>;
  planSetup(context: ProjectContext): Promise<SetupPlan>;
  applySetup(context: ProjectContext, plan: SetupPlan): Promise<{ changedFiles: string[] }>;
  run(context: ProjectContext, options?: { suite?: string; timeoutMs?: number }): Promise<RunResult>;
}
