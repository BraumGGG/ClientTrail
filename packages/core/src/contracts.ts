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
  | "assertion" | "backend" | "network" | "crash" | "security" | "adapter" | "evidence_incomplete" | "unknown";
export type RunStatus = "pending" | "running" | "paused" | "waiting_human" | "recovering" | "passed" | "failed" | "timeout" | "cancelled" | "blocked" | "error";
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
  run(context: ProjectContext, options?: { suite?: string; timeoutMs?: number; contract?: TestContract }): Promise<RunResult>;
  capabilities?(context: ProjectContext): Promise<AdapterCapabilities>;
}

export interface TestContract {
  contractVersion: 1;
  contractHash?: string;
  objectives: Array<{ id: string; description: string; required: boolean }>;
  preconditions: Array<{ id: string; description: string; required: boolean }>;
  requiredCapabilities: string[];
  optionalDegradations: string[];
  passCriteria: string[];
  failCriteria: string[];
  blockedCriteria: string[];
  evidencePolicy?: { required: string[]; recommended?: string[]; notApplicable?: string[] };
  scope?: Record<string, unknown>;
}

export interface AdapterCapabilities {
  adapterId: string;
  capabilities: string[];
  mappings?: Record<string, string | "not_applicable">;
  unsupported?: string[];
}

export const suiteTiers = ["smoke", "functional", "recovery", "soak", "stress", "security"] as const;
export type SuiteTier = typeof suiteTiers[number];
export type QualityDimensionStatus = "verified" | "partial" | "incomplete" | "risky" | "blocked" | "not_applicable" | "unknown";

export interface ResourceAllocation {
  instanceId: string;
  applicationId?: string;
  binaryPath?: string;
  binarySha256?: string | "not-produced";
  resourceDirectory?: string;
  webdriverOrCdpPort?: number;
  externalDependencyPorts?: number[];
  appDataDirectory?: string;
  controlDirectory?: string;
  persistentStorePaths?: string[];
  temporaryDirectory?: string;
  cargoTargetDirectory?: string;
  sharing?: Record<string, "isolated" | "shared_readonly" | "not_applicable">;
}

export interface IsolationPreflight {
  status: "passed" | "isolation_blocked" | "not_configured";
  instances: ResourceAllocation[];
  conflicts: Array<{ resource: string; instances: string[]; reason: string }>;
}

export interface FaultCase {
  id: string;
  faults: Array<{ type: string; stage?: string; target?: string }>;
  status?: "planned" | "executed" | "passed" | "failed" | "blocked" | "not_supported";
  blockedBy?: string;
}

export interface FaultMatrix {
  strategy: "pairwise" | "full" | "selected";
  cases: FaultCase[];
}

export interface QualityDimensions {
  businessCoverage: QualityDimensionStatus;
  evidenceCompleteness: QualityDimensionStatus;
  faultCoverage: QualityDimensionStatus;
  isolation: QualityDimensionStatus;
  provenance: QualityDimensionStatus;
}

export interface ProviderExecution {
  mode: "live" | "record" | "replay" | "not_applicable";
  provider?: string;
  model?: string;
  schemaVersion?: string;
  latency?: { samples: number; p95Ms?: number; p99Ms?: number };
  errorTypes?: string[];
  redactionPolicy?: string;
  replayCompatibility?: "compatible" | "incompatible" | "unknown";
}
