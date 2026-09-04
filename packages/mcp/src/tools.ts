import { z } from "zod";
import { createProjectContext } from "@client-test/core";
import { tauriAdapter } from "@client-test/adapter-tauri";
import { runNativeOperation } from "@client-test/adapter-native";
import { ActionRecorder, ApplicationManager, generateWdioDraft } from "@client-test/core";
import { WebViewSession } from "@client-test/adapter-webview";

export const applicationManager = new ApplicationManager();
export const actionRecorder = new ActionRecorder();

export const projectStatusInput = z.object({ project: z.string().optional() }).strict();
export const emptyInput = z.object({}).strict();
export const nativeInput = z.object({ app: z.string().min(1), selector: z.string().optional(), value: z.string().optional(), project: z.string().optional() }).strict();
export const webviewInput = z.object({ selector: z.string().optional(), value: z.string().optional(), timeout: z.number().int().positive().max(120_000).optional(), project: z.string().optional() }).strict();

export async function projectStatus(input: z.infer<typeof projectStatusInput>) {
  const context = await createProjectContext(input.project ?? process.cwd());
  return tauriAdapter.doctor(context);
}

export async function launchApplication(input: z.infer<typeof projectStatusInput>) {
  const context = await createProjectContext(input.project ?? process.cwd());
  const command = context.config.project.appCommand;
  if (!command) return { error: { code: "configuration", message: "project.appCommand is not configured" } };
  return applicationManager.launch(command, context.projectRoot);
}

export function stopApplication() { return applicationManager.stop(); }
export function applicationStatus() { return applicationManager.status(); }

let webviewSession: WebViewSession | undefined;
async function getWebViewSession(project?: string) {
  const context = await createProjectContext(project ?? process.cwd());
  const endpoint = context.config.project.webviewEndpoint;
  if (!endpoint) throw new Error("project.webviewEndpoint is not configured");
  webviewSession ??= await WebViewSession.connect(endpoint);
  return webviewSession;
}
export async function webviewSnapshot(project?: string) { return (await getWebViewSession(project)).snapshot(); }
export async function webviewFind(input: z.infer<typeof webviewInput>) { if (!input.selector) throw new Error("selector is required"); return (await getWebViewSession(input.project)).find(input.selector); }
export async function webviewAction(action: "click" | "fill", input: z.infer<typeof webviewInput>) { if (!input.selector) throw new Error("selector is required"); const session = await getWebViewSession(input.project); const result = action === "click" ? await session.click(input.selector) : await session.fill(input.selector, input.value ?? ""); actionRecorder.record({ type: action, selector: input.selector, value: input.value }); return result; }
export async function webviewWait(input: z.infer<typeof webviewInput>) { if (!input.selector) throw new Error("selector is required"); const result = await (await getWebViewSession(input.project)).wait(input.selector, input.timeout); actionRecorder.record({ type: "wait", selector: input.selector }); return result; }
export async function closeWebViewSession() { await webviewSession?.close(); webviewSession = undefined; }

export function startRecording() { actionRecorder.start(); return actionRecorder.status(); }
export function stopRecording() { const actions = actionRecorder.stop(); return { actions, draft: generateWdioDraft(actions), requiresValidation: true }; }
export function recordingStatus() { return actionRecorder.status(); }

export function unsupported(operation: string) {
  return { error: { code: "capability-unavailable", operation, message: `${operation} is not available for the detected adapter` } };
}

export function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

export async function nativeOperation(operation: "snapshot" | "find" | "invoke" | "wait", input: z.infer<typeof nativeInput>) {
  const context = await createProjectContext(input.project ?? process.cwd());
  const result = await runNativeOperation(context, operation, input.app, input.selector, input.value);
  if (operation === "invoke" && input.selector) actionRecorder.record({ type: "native-invoke", selector: input.selector, app: input.app });
  if (operation === "wait" && input.selector) actionRecorder.record({ type: "native-wait", selector: input.selector, app: input.app });
  return { operation, adapter: context.platform === "win32" ? "windows-uia" : context.platform === "darwin" ? "macos-ax" : "unsupported", ...result };
}
