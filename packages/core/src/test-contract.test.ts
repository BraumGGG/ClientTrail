import { describe, expect, it } from "vitest";
import { contractHash, validateTestContract } from "./test-contract.js";

const base = {
  contractVersion: 1 as const,
  objectives: [{ id: "launch", description: "应用可以启动并建立测试会话", required: true }],
  preconditions: [],
  requiredCapabilities: ["structured-ui"],
  optionalDegradations: ["screenshots"],
  passCriteria: ["launch assertion passes"],
  failCriteria: ["launch assertion fails"],
  blockedCriteria: ["session cannot be created"],
};

describe("test contract", () => {
  it("adds a stable hash and validates the contract", () => {
    const result = validateTestContract(base);
    expect(result.contractHash).toBe(contractHash(base));
  });

  it("rejects a changed contract hash", () => {
    expect(() => validateTestContract({ ...base, contractHash: "bad" })).toThrow("hash mismatch");
  });
});
