import { mkdir, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { AggregateResult, ProjectContext } from "@client-test/core";
import { CLIENT_TEST_VERSION } from "@client-test/core";

export interface RunSelectionEntry {
  adapterId: string;
  reason: string;
}

export interface RunSelection {
  mode: "suite" | "full";
  selected: RunSelectionEntry[];
  notSelected: RunSelectionEntry[];
}

export interface AggregateEvidenceResult extends AggregateResult {
  schemaVersion: 1;
  requestRunId: string;
  finalized: true;
  producerVersion: string;
  projectRoot: string;
  startedAt: string;
  endedAt: string;
  contractHash?: string;
  selection: RunSelection;
}

export function createRequestRunId(now = new Date(), idFactory: () => string = () => randomUUID()): string {
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  return `request-${timestamp}-${idFactory().slice(0, 8)}`;
}

export async function writeAggregateResult(input: {
  context: ProjectContext;
  requestRunId: string;
  startedAt: string;
  aggregate: AggregateResult;
  selection: RunSelection;
  contractHash?: string;
}): Promise<AggregateEvidenceResult & { aggregateResultPath: string; artifactDirectory: string }> {
  const artifactRoot = join(input.context.projectRoot, input.context.config.artifacts.directory);
  const artifactDirectory = join(artifactRoot, input.requestRunId);
  const aggregateResultPath = join(artifactDirectory, "aggregate-result.json");
  const result: AggregateEvidenceResult = {
    schemaVersion: 1,
    requestRunId: input.requestRunId,
    finalized: true,
    producerVersion: CLIENT_TEST_VERSION,
    projectRoot: input.context.projectRoot,
    startedAt: input.startedAt,
    endedAt: new Date().toISOString(),
    contractHash: input.contractHash,
    selection: input.selection,
    ...input.aggregate,
  };
  await mkdir(artifactDirectory, { recursive: true });
  const temporaryPath = join(artifactDirectory, ".aggregate-result.json.tmp");
  await writeFile(temporaryPath, JSON.stringify(result, null, 2), "utf8");
  await rename(temporaryPath, aggregateResultPath);
  return { ...result, aggregateResultPath, artifactDirectory };
}
