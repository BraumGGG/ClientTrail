const { test, expect, _electron: electron } = require("@playwright/test");

test("invokes the Electron main process through preload API", async () => {
  const app = await electron.launch({ args: ["."] });
  const window = await app.firstWindow();
  await window.locator("#name").fill("Codex");
  await window.locator("#greet").click();
  await expect(window.locator("#result")).toHaveText("Hello, Codex!");
  await app.close();
});
