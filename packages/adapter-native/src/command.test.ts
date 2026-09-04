import { describe, expect, it } from "vitest";
import { buildNativeCommand } from "./run.js";

describe("native command protocol", () => {
  it("maps Windows operations to winapp UIA commands", () => {
    expect(buildNativeCommand("win32", "snapshot", "notepad")).toEqual({ executable: "winapp.exe", args: ["ui", "inspect", "-a", "notepad", "--json"] });
    expect(buildNativeCommand("win32", "invoke", "notepad", "Save").args).toEqual(["ui", "invoke", "Save", "-a", "notepad", "--json"]);
  });
});
