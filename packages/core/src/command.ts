import type { CommandSpec } from "./contracts.js";

export type CommandInput = string | { executable: string; args?: string[] };

/** Parse a human command without invoking a shell. Supports single/double quotes and backslash escapes. */
export function parseCommand(input: CommandInput, cwd: string): CommandSpec {
  if (typeof input !== "string") return { executable: input.executable, args: input.args ?? [], cwd };
  const tokens: string[] = [];
  let token = "";
  let quote: "'" | '"' | undefined;
  let escaped = false;
  const source = input.trim();
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) { token += char; escaped = false; continue; }
    const next = source[index + 1];
    if (char === "\\" && quote !== "'" && (next === '"' || next === "'" || next === "\\" || /\s/.test(next ?? ""))) { escaped = true; continue; }
    if (quote) { if (char === quote) quote = undefined; else token += char; continue; }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (/\s/.test(char)) { if (token) { tokens.push(token); token = ""; } continue; }
    token += char;
  }
  if (escaped) token += "\\";
  if (quote) throw new Error("Unterminated quote in command");
  if (token) tokens.push(token);
  const [executable, ...args] = tokens;
  if (!executable) throw new Error("Command cannot be empty");
  return { executable, args, cwd };
}
