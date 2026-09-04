import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { ClientTestConfig } from "./contracts.js";

const configSchema = z.object({
  version: z.literal(1),
  project: z.object({ kind: z.string().optional(), root: z.string().default("."), appCommand: z.string().optional(), webviewEndpoint: z.string().url().optional() }).default({ root: "." }),
  adapters: z.record(z.object({ enabled: z.union([z.boolean(), z.literal("auto")]), command: z.union([z.string(), z.object({ executable: z.string().min(1), args: z.array(z.string()).optional() })]).optional() })).default({}),
  artifacts: z.object({ directory: z.string().default(".client-test/artifacts"), redact: z.boolean().default(true) }).default({ directory: ".client-test/artifacts", redact: true }),
});

export async function loadConfig(projectRoot: string): Promise<ClientTestConfig> {
  const path = join(projectRoot, "client-test.config.yaml");
  if (!existsSync(path)) {
    return configSchema.parse({ version: 1, project: { root: "." }, adapters: {}, artifacts: { directory: ".client-test/artifacts", redact: true } });
  }
  return configSchema.parse(parse(readFileSync(path, "utf8")));
}
