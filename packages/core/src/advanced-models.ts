import { z } from "zod";

export const resourceAllocationSchema = z.object({
  instanceId: z.string().min(1), applicationId: z.string().optional(), binaryPath: z.string().optional(), binarySha256: z.string().optional(), resourceDirectory: z.string().optional(), webdriverOrCdpPort: z.number().int().positive().optional(), externalDependencyPorts: z.array(z.number().int().positive()).optional(), appDataDirectory: z.string().optional(), controlDirectory: z.string().optional(), persistentStorePaths: z.array(z.string()).optional(), temporaryDirectory: z.string().optional(), cargoTargetDirectory: z.string().optional(), sharing: z.record(z.enum(["isolated", "shared_readonly", "not_applicable"])).optional(),
});
export const isolationPreflightSchema = z.object({ status: z.enum(["passed", "isolation_blocked", "not_configured"]), instances: z.array(resourceAllocationSchema), conflicts: z.array(z.object({ resource: z.string(), instances: z.array(z.string()), reason: z.string() })) });
export const faultMatrixSchema = z.object({ strategy: z.enum(["pairwise", "full", "selected"]), cases: z.array(z.object({ id: z.string().min(1), faults: z.array(z.object({ type: z.string().min(1), stage: z.string().optional(), target: z.string().optional() })), status: z.enum(["planned", "executed", "passed", "failed", "blocked", "not_supported"]).optional(), blockedBy: z.string().optional() })) });
export const qualityDimensionsSchema = z.object({ businessCoverage: z.enum(["verified", "partial", "incomplete", "risky", "blocked", "not_applicable", "unknown"]), evidenceCompleteness: z.enum(["verified", "partial", "incomplete", "risky", "blocked", "not_applicable", "unknown"]), faultCoverage: z.enum(["verified", "partial", "incomplete", "risky", "blocked", "not_applicable", "unknown"]), isolation: z.enum(["verified", "partial", "incomplete", "risky", "blocked", "not_applicable", "unknown"]), provenance: z.enum(["verified", "partial", "incomplete", "risky", "blocked", "not_applicable", "unknown"]) });
export const providerExecutionSchema = z.object({ mode: z.enum(["live", "record", "replay", "not_applicable"]), provider: z.string().optional(), model: z.string().optional(), schemaVersion: z.string().optional(), latency: z.object({ samples: z.number().int().nonnegative(), p95Ms: z.number().nonnegative().optional(), p99Ms: z.number().nonnegative().optional() }).optional(), errorTypes: z.array(z.string()).optional(), redactionPolicy: z.string().optional(), replayCompatibility: z.enum(["compatible", "incompatible", "unknown"]).optional() });

export function detectIsolationConflicts(instances: Array<z.infer<typeof resourceAllocationSchema>>): z.infer<typeof isolationPreflightSchema> {
  const keys = ["webdriverOrCdpPort", "appDataDirectory", "controlDirectory", "temporaryDirectory", "cargoTargetDirectory"] as const;
  const conflicts: Array<{ resource: string; instances: string[]; reason: string }> = [];
  for (const key of keys) {
    const groups = new Map<string, string[]>();
    for (const instance of instances) { const value = instance[key]; if (value === undefined) continue; const normalized = String(value).toLowerCase(); groups.set(normalized, [...(groups.get(normalized) ?? []), instance.instanceId]); }
    for (const [value, ids] of groups) if (ids.length > 1) conflicts.push({ resource: key, instances: ids, reason: `shared writable resource: ${value}` });
  }
  return { status: conflicts.length ? "isolation_blocked" : "passed", instances, conflicts };
}
