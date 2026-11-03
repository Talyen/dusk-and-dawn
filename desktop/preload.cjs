const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("duskDesktop", {
  quit: () => ipcRenderer.invoke("app:quit"),
  getFullscreen: () => ipcRenderer.invoke("display:get-fullscreen"),
  setFullscreen: (enabled) => ipcRenderer.invoke("display:set-fullscreen", enabled),
  onFullscreenChange: (listener) => {
    const handler = (_event, enabled) => listener(enabled);
    ipcRenderer.on("display:changed", handler);
    return () => ipcRenderer.removeListener("display:changed", handler);
  },
  readSaveCandidates: () => ipcRenderer.invoke("save:read"),
  writeSave: (data, preserveBackup = false) => ipcRenderer.invoke("save:write", data, preserveBackup),
});
