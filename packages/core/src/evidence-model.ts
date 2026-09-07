import { z } from "zod";

export const stateTransitionSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  at: z.string().datetime(),
  runId: z.string().min(1),
  sessionId: z.string().optional(),
  eventCursor: z.string().optional(),
  reason: z.string().optional(),
  responseSummary: z.record(z.unknown()).optional(),
});

export const evidenceRefSchema = z.object({
  kind: z.enum(["assertion", "api", "ipc", "state", "event", "projection", "log", "screenshot", "trace", "manifest"]),
  path: z.string().min(1),
  locator: z.string().optional(),
  summary: z.string().optional(),
});

export const evidenceClosureSchema = z.object({
  assertionId: z.string().min(1),
  status: z.enum(["complete", "incomplete", "not_applicable"]),
  requiredKinds: z.array(z.string()),
  references: z.array(evidenceRefSchema),
  missingKinds: z.array(z.string()),
});

export type StateTransition = z.infer<typeof stateTransitionSchema>;
export type EvidenceClosure = z.infer<typeof evidenceClosureSchema>;
