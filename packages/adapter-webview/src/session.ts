import { chromium, type Browser, type Page } from "playwright-core";

export interface WebViewSnapshot { url: string; title: string; text: string; elements: Array<{ tag: string; role?: string; name?: string; id?: string; testId?: string }> }

function assertLocalEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("WebView endpoint must use http or https");
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(url.hostname)) throw new Error("WebView endpoint must be local");
  return url;
}

export class WebViewSession {
  private constructor(private readonly browser: Browser, private readonly page: Page) {}

  static async connect(endpoint: string): Promise<WebViewSession> {
    const url = assertLocalEndpoint(endpoint);
    const browser = await chromium.connectOverCDP(url.toString());
    const page = browser.contexts().flatMap((context) => context.pages())[0];
    if (!page) { await browser.close(); throw new Error("No WebView page found at endpoint"); }
    return new WebViewSession(browser, page);
  }

  async snapshot(): Promise<WebViewSnapshot> {
    const elements = await this.page.locator("button, input, textarea, select, a, [role]").evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName.toLowerCase(), role: node.getAttribute("role") ?? undefined, name: (node.getAttribute("aria-label") ?? node.textContent ?? "").trim() || undefined, id: node.id || undefined, testId: node.getAttribute("data-testid") ?? undefined })));
    return { url: this.page.url(), title: await this.page.title(), text: await this.page.locator("body").innerText(), elements };
  }

  async find(selector: string) { const locator = this.page.locator(selector); return { selector, count: await locator.count(), visible: await locator.first().isVisible().catch(() => false), enabled: await locator.first().isEnabled().catch(() => false), text: await locator.first().innerText().catch(() => "") }; }
  async click(selector: string) { await this.page.locator(selector).click(); return { selector, action: "click" as const }; }
  async fill(selector: string, value: string) { await this.page.locator(selector).fill(value); return { selector, action: "fill" as const }; }
  async wait(selector: string, timeout = 10_000) { await this.page.locator(selector).waitFor({ state: "visible", timeout }); return { selector, state: "visible" as const }; }
  async close() { await this.browser.close(); }
}

export { assertLocalEndpoint };
