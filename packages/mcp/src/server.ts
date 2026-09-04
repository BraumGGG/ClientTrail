import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { classifyError } from "@client-test/core";
import { projectStatusInput, emptyInput, nativeInput, webviewInput, projectStatus, launchApplication, stopApplication, applicationStatus, nativeOperation, webviewSnapshot, webviewFind, webviewAction, webviewWait, closeWebViewSession, startRecording, stopRecording, recordingStatus, unsupported, textResult } from "./tools.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "client-test", version: "0.1.0" });
  const safe = (fn: () => Promise<ReturnType<typeof textResult>> | ReturnType<typeof textResult>) => Promise.resolve().then(fn).catch((error) => textResult({ error: { code: classifyError(error), message: error instanceof Error ? error.message : String(error) } }));
  server.registerTool("project_status", { description: "Inspect the project and available client test adapters", inputSchema: { project: projectStatusInput.shape.project } }, (input) => safe(() => textResult(projectStatus(input))));
  server.registerTool("app_launch", { description: "Launch the configured application for interactive exploration", inputSchema: { project: projectStatusInput.shape.project } }, (input) => safe(async () => textResult(await launchApplication(input))));
  server.registerTool("app_stop", { description: "Stop the application used for interactive exploration", inputSchema: {} }, () => safe(() => textResult(stopApplication())));
  server.registerTool("app_status", { description: "Read the application process status", inputSchema: {} }, () => safe(() => textResult(applicationStatus())));
  server.registerTool("evidence_capture", { description: "Capture exploration evidence", inputSchema: {} }, () => safe(() => textResult(unsupported("evidence_capture"))));
  for (const operation of ["snapshot", "find", "invoke", "wait"] as const) {
    server.registerTool(`native_${operation}`, { description: `Run a structured native UI ${operation} operation`, inputSchema: nativeInput.shape }, (input) => safe(async () => textResult(await nativeOperation(operation, input))));
  }
  server.registerTool("ui_snapshot", { description: "Read the WebView DOM and accessible controls", inputSchema: { project: projectStatusInput.shape.project } }, (input) => safe(async () => textResult(await webviewSnapshot(input.project))));
  server.registerTool("ui_find", { description: "Find a WebView element and inspect its state", inputSchema: webviewInput.shape }, (input) => safe(async () => textResult(await webviewFind(input))));
  server.registerTool("ui_click", { description: "Click a WebView element", inputSchema: webviewInput.shape }, (input) => safe(async () => textResult(await webviewAction("click", input))));
  server.registerTool("ui_fill", { description: "Fill a WebView input", inputSchema: webviewInput.shape }, (input) => safe(async () => textResult(await webviewAction("fill", input))));
  server.registerTool("ui_wait", { description: "Wait for a WebView element to become visible", inputSchema: webviewInput.shape }, (input) => safe(async () => textResult(await webviewWait(input))));
  process.once("exit", () => { void closeWebViewSession(); });
  server.registerTool("record_start", { description: "Start recording exploration actions", inputSchema: {} }, () => safe(() => textResult(startRecording())));
  server.registerTool("record_stop", { description: "Stop recording and generate a deterministic WDIO draft", inputSchema: {} }, () => safe(() => textResult(stopRecording())));
  server.registerTool("record_status", { description: "Read action recorder status", inputSchema: {} }, () => safe(() => textResult(recordingStatus())));
  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}

const entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entry) runMcpServer().catch((error) => { console.error(error); process.exitCode = 4; });
