import { z } from "zod";
import type { FailureKind, TestContract } from "./contracts.js";

export const objectiveStateSchema = z.enum(["started", "passed", "failed", "blocked", "not_executed"]);

export const objectiveEventSchema = z.object({
  runId: z.string().min(1),
  objectiveId: z.string().min(1),
  state: objectiveStateSchema,
  at: z.string().datetime(),
  phase: z.string().optional(),
  failureKind: z.enum([
    "environment", "build", "launch", "locator", "timeout",
    "assertion", "backend", "network", "crash", "security",
    "adapter", "evidence_incomplete", "unknown",
  ]).optional(),
  blockedBy: z.string().optional(),
  instanceId: z.string().optional(),
  sessionId: z.string().optional(),
  message: z.string().optional(),
  evidence: z.array(z.string()).optional(),
}).superRefine((event, context) => {
  if (event.state === "blocked" && !event.blockedBy) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["blockedBy"],
      message: "blocked objective events require blockedBy",
    });
  }
});

export type ObjectiveEvent = z.infer<typeof objectiveEventSchema>;
export type ObjectiveEventInput = Omit<ObjectiveEvent, "runId" | "at"> & { at?: string };

export interface RuntimeInstanceFacts {
  instanceId: string;
  binaryPath?: string;
  pid?: number;
  webdriverOrCdpPort?: number;
  appDataDirectory?: string;
  sessionId?: string;
}

export interface ObjectiveOutcome {
  id: string;
  required: boolean;
  state: "passed" | "failed" | "blocked" | "not_executed";
  failureKind?: FailureKind;
  blockedBy?: string;
  message?: string;
  evidence?: string[];
}

export interface ObjectiveSummary {
  objectives: ObjectiveOutcome[];
  counts: { passed: number; failed: number; blocked: number; notExecuted: number };
  allRequiredPassed: boolean;
}

const runLevelFailureKinds = new Set<FailureKind>(["environment", "build", "launch", "timeout", "adapter", "crash"]);

function hasBusinessAssertionEvidence(event: ObjectiveEvent): boolean {
  if (event.evidence?.some((reference) => /#.+$|::|@[A-Za-z0-9_-]+$/.test(reference))) return true;
  return /business|assert|functional|test[-_ ]?step|spec/i.test(event.phase ?? "");
}

export function reconcileObjectiveEvents(
  events: ObjectiveEvent[],
  context: { runFailureKind?: FailureKind; runnerTerminated?: boolean },
): { events: ObjectiveEvent[]; warnings: string[] } {
  const runFailureKind = context.runFailureKind;
  if (!runFailureKind || (!context.runnerTerminated && !runLevelFailureKinds.has(runFailureKind))) {
    return { events, warnings: [] };
  }

  const latestTerminal = new Map<string, ObjectiveEvent>();
  for (const event of events) {
    if (event.state !== "started") latestTerminal.set(event.objectiveId, event);
  }
  const candidates = [...latestTerminal.values()]
    .filter((event) => event.state === "failed" && event.failureKind === "assertion" && !hasBusinessAssertionEvidence(event))
    .sort((left, right) => left.at.localeCompare(right.at));
  const root = candidates[0];
  if (!root) return { events, warnings: [] };

  const replacements = new Map<string, ObjectiveEvent>();
  replacements.set(root.objectiveId, { ...root, failureKind: runFailureKind });
  for (const event of candidates.slice(1)) {
    replacements.set(event.objectiveId, {
      ...event,
      state: "blocked",
      failureKind: undefined,
      blockedBy: root.objectiveId,
      message: `blocked after ${root.objectiveId} failed due to ${runFailureKind}`,
    });
  }

  return {
    events: events.map((event) => latestTerminal.get(event.objectiveId) === event
      ? replacements.get(event.objectiveId) ?? event
      : event),
    warnings: [`objective failure classifications were corrected from unproven assertions using run-level ${runFailureKind}`],
  };
}

export function summarizeObjectiveEvents(contract: TestContract, events: ObjectiveEvent[]): ObjectiveSummary {
  const terminal = new Map<string, ObjectiveEvent>();
  for (const event of events) {
    if (event.state !== "started") terminal.set(event.objectiveId, event);
  }

  const objectives = contract.objectives
    .filter((objective) => objective.required || terminal.has(objective.id))
    .map<ObjectiveOutcome>((objective) => {
      const event = terminal.get(objective.id);
      if (!event) return { id: objective.id, required: objective.required, state: "not_executed" };
      return {
        id: objective.id,
        required: objective.required,
        state: event.state as ObjectiveOutcome["state"],
        failureKind: event.failureKind,
        blockedBy: event.blockedBy,
        message: event.message,
        evidence: event.evidence,
      };
    });

  const counts = {
    passed: objectives.filter((item) => item.state === "passed").length,
    failed: objectives.filter((item) => item.state === "failed").length,
    blocked: objectives.filter((item) => item.state === "blocked").length,
    notExecuted: objectives.filter((item) => item.state === "not_executed").length,
  };

  return {
    objectives,
    counts,
    allRequiredPassed: objectives.filter((item) => item.required).every((item) => item.state === "passed"),
  };
}
