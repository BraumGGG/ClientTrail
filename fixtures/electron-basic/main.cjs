const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

function createWindow() {
  const window = new BrowserWindow({ width: 640, height: 480, webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true } });
  window.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("greet", (_event, name) => `Hello, ${name}!`);
app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
