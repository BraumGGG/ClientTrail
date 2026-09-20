import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { FailureKind, ProjectContext, RunStatus, TestContract } from "./contracts.js";
import type { StateTransition } from "./evidence-model.js";
import {
  objectiveEventSchema,
  summarizeObjectiveEvents,
  type ObjectiveEvent,
  type ObjectiveEventInput,
  type ObjectiveSummary,
  type RuntimeInstanceFacts,
} from "./objective-results.js";
import { redactText } from "./redaction.js";

type EvidenceFileStatus = {
  status: "produced" | "empty" | "not-produced";
  bytes?: number;
  reason?: string;
};

export interface EvidenceFinalization {
  status: RunStatus | "interrupted";
  failureKind?: FailureKind;
  objectiveSummary?: ObjectiveSummary;
  evidenceWarnings: string[];
  runtimeInstances: RuntimeInstanceFacts[];
}

export class EvidenceSession {
  readonly runId: string;
  readonly directory: string;
  private transitions: StateTransition[] = [];
  private objectiveEvents: ObjectiveEvent[] = [];
  private runtimeInstances = new Map<string, RuntimeInstanceFacts>();
  private files: Record<string, EvidenceFileStatus> = {};

  private constructor(private readonly redact = true, directory: string, private readonly contract?: TestContract) {
    this.runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    this.directory = join(directory, this.runId);
  }

  static async create(context: ProjectContext, contract?: TestContract): Promise<EvidenceSession> {
    const session = new EvidenceSession(context.config.artifacts.redact, join(context.projectRoot, context.config.artifacts.directory), contract);
    await mkdir(session.directory, { recursive: true });
    await session.writeManifest({ schemaVersion: 1, runId: session.runId, projectRoot: context.projectRoot, platform: context.platform, status: "running", contractHash: session.contract?.contractHash, files: {} });
    return session;
  }

  childEnvironment(): Record<string, string> {
    return {
      CLIENT_TEST_RUN_ID: this.runId,
      CLIENT_TEST_ARTIFACT_DIR: this.directory,
    };
  }

  async transition(to: RunStatus, details: Omit<StateTransition, "from" | "to" | "at" | "runId"> = {}): Promise<void> {
    const from = this.transitions.at(-1)?.to ?? "pending";
    const transition: StateTransition = { from, to, at: new Date().toISOString(), runId: this.runId, ...details };
    this.transitions.push(transition);
    await this.write("state-timeline.json", this.transitions);
  }

  async recordObjective(input: ObjectiveEventInput): Promise<void> {
    const event = objectiveEventSchema.parse({
      ...input,
      runId: this.runId,
      at: input.at ?? new Date().toISOString(),
    }) as ObjectiveEvent;
    this.objectiveEvents.push(event);
    await this.write("objective-events.json", this.objectiveEvents);
  }

  async recordRuntimeInstance(facts: RuntimeInstanceFacts): Promise<void> {
    this.runtimeInstances.set(facts.instanceId, facts);
    await this.write("runtime-instances.json", [...this.runtimeInstances.values()]);
  }

  markNotProduced(name: string, reason: string): void {
    this.files[name] = { status: "not-produced", reason };
  }

  async write(name: string, value: string | unknown): Promise<void> {
    const content = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    const output = this.redact ? redactText(content) : content;
    const bytes = Buffer.byteLength(output, "utf8");
    this.files[name] = { status: bytes === 0 ? "empty" : "produced", bytes };
    await writeFile(join(this.directory, name), output, "utf8");
  }

  async finalize(status: RunStatus | "interrupted", details: Record<string, unknown> = {}): Promise<EvidenceFinalization> {
    const loadedObjectives = await this.loadObjectiveEvents();
    const objectiveSummary = this.contract
      ? summarizeObjectiveEvents(this.contract, loadedObjectives.events)
      : undefined;
    const requiredFailed = objectiveSummary?.objectives.some((item) => item.required && item.state === "failed") ?? false;
    const requiredIncomplete = objectiveSummary?.objectives.some((item) => item.required && (item.state === "blocked" || item.state === "not_executed")) ?? false;

    let finalStatus = status;
    let failureKind = details.failureKind as FailureKind | undefined;
    if (status === "passed" && requiredFailed) finalStatus = "failed";
    if (status === "passed" && !requiredFailed && requiredIncomplete) finalStatus = "blocked";
    if (status === "passed" && objectiveSummary && !objectiveSummary.allRequiredPassed) {
      failureKind ??= objectiveSummary.objectives.find((item) => item.required && item.state === "failed")?.failureKind
        ?? "evidence_incomplete";
    }

    const evidenceWarnings = Object.entries(this.files).flatMap(([name, file]) =>
      file.status === "empty" ? [`${name} is empty`]
        : file.status === "not-produced" ? [`${name} was not produced: ${file.reason}`]
          : []);
    if (loadedObjectives.warning) evidenceWarnings.push(loadedObjectives.warning);
    const runtimeInstances = [...this.runtimeInstances.values()];
    const result = {
      schemaVersion: 1,
      runId: this.runId,
      ...details,
      status: finalStatus,
      failureKind,
      objectiveSummary,
      evidenceWarnings,
      runtimeInstances,
    };
    const temp = join(this.directory, ".result.json.tmp");
    const resultContent = JSON.stringify(result, null, 2);
    const resultOutput = this.redact ? redactText(resultContent) : resultContent;
    await writeFile(temp, resultOutput, "utf8");
    await rename(temp, join(this.directory, "result.json"));
    this.files["result.json"] = { status: "produced", bytes: Buffer.byteLength(resultOutput, "utf8") };
    await this.writeManifest({
      schemaVersion: 1,
      runId: this.runId,
      status: finalStatus,
      finalized: true,
      contractHash: this.contract?.contractHash,
      transitions: this.transitions.length,
      details,
      failureKind,
      objectiveSummary,
      evidenceWarnings,
      runtimeInstances,
      files: this.files,
    });

    return { status: finalStatus, failureKind, objectiveSummary, evidenceWarnings, runtimeInstances };
  }

  private async writeManifest(value: unknown): Promise<void> {
    const content = JSON.stringify(value, null, 2);
    await writeFile(join(this.directory, "manifest.json"), this.redact ? redactText(content) : content, "utf8");
  }

  private async loadObjectiveEvents(): Promise<{ events: ObjectiveEvent[]; warning?: string }> {
    const name = "objective-events.json";
    try {
      const content = await readFile(join(this.directory, name), "utf8");
      const bytes = Buffer.byteLength(content, "utf8");
      this.files[name] = { status: bytes === 0 ? "empty" : "produced", bytes };
      if (bytes === 0) return { events: [] };
      const parsed = JSON.parse(content) as unknown;
      if (!Array.isArray(parsed)) throw new Error("expected a JSON array");
      const events = parsed.map((event) => objectiveEventSchema.parse(event) as ObjectiveEvent);
      const matching = events.filter((event) => event.runId === this.runId);
      const warning = matching.length === events.length
        ? undefined
        : `${name} contains events for a different runId`;
      return { events: matching, warning };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        if (this.contract && this.objectiveEvents.length === 0) {
          this.markNotProduced(name, "no objective events were recorded");
        }
        return { events: this.objectiveEvents };
      }
      const message = error instanceof Error ? error.message : String(error);
      return { events: this.objectiveEvents, warning: `${name} is invalid: ${message}` };
    }
  }
}
