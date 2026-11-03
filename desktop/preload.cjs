const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("duskDesktop", {
  getFullscreen: () => ipcRenderer.invoke("display:get-fullscreen"),
  setFullscreen: (enabled) => ipcRenderer.invoke("display:set-fullscreen", enabled),
  onFullscreenChange: (listener) => {
    const handler = (_event, enabled) => listener(enabled);
    ipcRenderer.on("display:changed", handler);
    return () => ipcRenderer.removeListener("display:changed", handler);
  },
  readSaveCandidates: () => ipcRenderer.invoke("save:read"),
  writeSave: (data) => ipcRenderer.invoke("save:write", data),
});
