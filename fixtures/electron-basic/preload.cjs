const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fixtureApi", { greet: (name) => ipcRenderer.invoke("greet", name) });
