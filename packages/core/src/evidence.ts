import { mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectContext, RunStatus, TestContract } from "./contracts.js";
import type { StateTransition } from "./evidence-model.js";
import { redactText } from "./redaction.js";

export class EvidenceSession {
  readonly runId: string;
  readonly directory: string;
  private transitions: StateTransition[] = [];
  private constructor(private readonly redact = true, directory: string, private readonly contract?: TestContract) {
    this.runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    this.directory = join(directory, this.runId);
  }

  static async create(context: ProjectContext, contract?: TestContract): Promise<EvidenceSession> {
    const session = new EvidenceSession(context.config.artifacts.redact, join(context.projectRoot, context.config.artifacts.directory), contract);
    await mkdir(session.directory, { recursive: true });
    await session.write("manifest.json", { schemaVersion: 1, runId: session.runId, projectRoot: context.projectRoot, platform: context.platform, status: "running", contractHash: session.contract?.contractHash, files: {} });
    return session;
  }

  async transition(to: RunStatus, details: Omit<StateTransition, "from" | "to" | "at" | "runId"> = {}): Promise<void> {
    const from = this.transitions.at(-1)?.to ?? "pending";
    const transition: StateTransition = { from, to, at: new Date().toISOString(), runId: this.runId, ...details };
    this.transitions.push(transition);
    await this.write("state-timeline.json", this.transitions);
  }

  async write(name: string, value: string | unknown): Promise<void> {
    const content = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    await writeFile(join(this.directory, name), this.redact ? redactText(content) : content, "utf8");
  }

  async finalize(status: RunStatus | "interrupted", details: Record<string, unknown> = {}): Promise<void> {
    const result = { schemaVersion: 1, runId: this.runId, status, ...details };
    const temp = join(this.directory, ".result.json.tmp");
    await writeFile(temp, JSON.stringify(result, null, 2), "utf8");
    await rename(temp, join(this.directory, "result.json"));
    await this.write("manifest.json", { schemaVersion: 1, runId: this.runId, status, finalized: true, contractHash: this.contract?.contractHash, transitions: this.transitions.length, details });
  }
}
