import { mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectContext, RunStatus } from "./contracts.js";
import { redactText } from "./redaction.js";

export class EvidenceSession {
  readonly runId: string;
  readonly directory: string;
  private constructor(private readonly redact = true, directory: string) {
    this.runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
    this.directory = join(directory, this.runId);
  }

  static async create(context: ProjectContext): Promise<EvidenceSession> {
    const session = new EvidenceSession(context.config.artifacts.redact, join(context.projectRoot, context.config.artifacts.directory));
    await mkdir(session.directory, { recursive: true });
    await session.write("manifest.json", { schemaVersion: 1, runId: session.runId, projectRoot: context.projectRoot, platform: context.platform, status: "running", files: {} });
    return session;
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
    await this.write("manifest.json", { schemaVersion: 1, runId: this.runId, status, finalized: true, details });
  }
}
