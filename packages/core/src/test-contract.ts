import { createHash } from "node:crypto";
import { z } from "zod";
import type { TestContract } from "./contracts.js";

export const testContractSchema = z.object({
  contractVersion: z.literal(1),
  contractHash: z.string().optional(),
  objectives: z.array(z.object({ id: z.string().min(1), description: z.string().min(1), required: z.boolean() })),
  preconditions: z.array(z.object({ id: z.string().min(1), description: z.string().min(1), required: z.boolean() })),
  requiredCapabilities: z.array(z.string()),
  optionalDegradations: z.array(z.string()),
  passCriteria: z.array(z.string()),
  failCriteria: z.array(z.string()),
  blockedCriteria: z.array(z.string()),
  evidencePolicy: z.object({ required: z.array(z.string()), recommended: z.array(z.string()).optional(), notApplicable: z.array(z.string()).optional() }).optional(),
  scope: z.record(z.unknown()).optional(),
});

export function contractHash(contract: Omit<TestContract, "contractHash">): string {
  return createHash("sha256").update(JSON.stringify(contract)).digest("hex");
}

export function validateTestContract(value: unknown): TestContract {
  const parsed = testContractSchema.parse(value);
  const { contractHash: supplied, ...withoutHash } = parsed;
  const expected = contractHash(withoutHash);
  if (supplied && supplied !== expected) throw new Error(`test contract hash mismatch: expected ${expected}`);
  return { ...parsed, contractHash: supplied ?? expected };
}
