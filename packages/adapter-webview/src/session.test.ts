import { describe, expect, it } from "vitest";
import { assertLocalEndpoint } from "./session.js";

describe("WebView session", () => {
  it("only accepts local HTTP endpoints", () => {
    expect(assertLocalEndpoint("http://127.0.0.1:9222/json/version").port).toBe("9222");
    expect(() => assertLocalEndpoint("https://example.com")).toThrow();
    expect(() => assertLocalEndpoint("file:///tmp/webview")).toThrow();
  });
});
