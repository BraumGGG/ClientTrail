describe("Tauri fixture", () => {
  it("invokes a Tauri command through the WebView", async () => {
    const name = await $("#name");
    await name.setValue("Codex");
    await $("#greet").click();
    await expect($("#result")).toHaveText("Hello, Codex!");
  });
});
