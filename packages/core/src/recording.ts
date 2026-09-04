export type RecordedActionType = "click" | "fill" | "wait" | "native-invoke" | "native-wait";

export interface RecordedAction { type: RecordedActionType; selector: string; value?: string; app?: string; timestamp: string; }

export class ActionRecorder {
  private active = false;
  private actions: RecordedAction[] = [];
  start(): void { this.active = true; this.actions = []; }
  record(action: Omit<RecordedAction, "timestamp">): void { if (this.active) this.actions.push({ ...action, timestamp: new Date().toISOString() }); }
  stop(): RecordedAction[] { this.active = false; return [...this.actions]; }
  status() { return { active: this.active, actionCount: this.actions.length }; }
}

export function generateWdioDraft(actions: RecordedAction[]): string {
  const lines = actions.map((action) => {
    const selector = JSON.stringify(action.selector);
    if (action.type === "click") return `    await $(${selector}).click();`;
    if (action.type === "fill") return `    await $(${selector}).setValue(${JSON.stringify(action.value ?? "")});`;
    if (action.type === "wait") return `    await $(${selector}).waitForDisplayed();`;
    return `    // Native ${action.type}: app=${JSON.stringify(action.app ?? "")} selector=${selector}`;
  });
  return `describe("Recorded client flow", () => {\n  it("replays the explored workflow", async () => {\n${lines.join("\n")}\n  });\n});\n`;
}
