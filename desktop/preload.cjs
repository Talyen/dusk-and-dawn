const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("duskDesktop", {
  readSaveCandidates: () => ipcRenderer.invoke("save:read"),
  writeSave: (data) => ipcRenderer.invoke("save:write", data),
});
