const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("PanelAPI", {
  pick: (hex) => ipcRenderer.send("color-picked", { hex }),
  close: () => ipcRenderer.send("close-color-panel")
});
