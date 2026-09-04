import type { DetectionResult, ProjectContext, TestAdapter } from "./contracts.js";

export class AdapterRegistry {
  private readonly adapters = new Map<string, TestAdapter>();

  register(adapter: TestAdapter): this {
    if (this.adapters.has(adapter.id)) throw new Error(`Adapter already registered: ${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
    return this;
  }

  async detectAll(context: ProjectContext): Promise<DetectionResult[]> {
    return Promise.all([...this.adapters.values()].map((adapter) => adapter.detect(context)));
  }

  get(id: string): TestAdapter | undefined { return this.adapters.get(id); }
}
