import { describe, expect, it } from "vitest";
import { redactText } from "./redaction.js";

describe("redaction", () => {
  it("removes common credentials from logs", () => {
    const output = redactText("Authorization: Bearer abc123 api_key=secret cookie: sid=xyz");
    expect(output).not.toContain("abc123");
    expect(output).not.toContain("secret");
    expect(output).not.toContain("sid=xyz");
  });
});
