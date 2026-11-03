const { app, BrowserWindow, ipcMain } = require("electron");
const { createSaveStorage } = require("./save.cjs");
const path = require("node:path");

const developmentUrl = process.env.DUSK_DEV_URL;
const allowedDevUrl = "http://127.0.0.1:5173/";
if (developmentUrl && (app.isPackaged || developmentUrl !== allowedDevUrl.slice(0, -1))) {
  throw new Error("Invalid desktop development URL");
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: "#08080c",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const reportFullscreen = () => {
    const enabled = process.platform === "darwin" ? window.isSimpleFullScreen() : window.isFullScreen();
    window.webContents.send("display:changed", enabled);
  };
  window.on("enter-full-screen", reportFullscreen);
  window.on("leave-full-screen", reportFullscreen);
  window.on("resize", reportFullscreen);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());

  if (developmentUrl) {
    void window.loadURL(allowedDevUrl);
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  const storage = createSaveStorage(path.join(app.getPath("userData"), "saves"));
  const authorize = (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || event.senderFrame !== event.sender.mainFrame) throw new Error("Unauthorized request");
    return window;
  };
  ipcMain.handle("save:read", (event) => {
    authorize(event);
    return storage.readCandidates();
  });
  ipcMain.handle("save:write", (event, data, preserveBackup = false) => {
    authorize(event);
    if (typeof preserveBackup !== "boolean") throw new Error("Invalid backup option");
    return storage.write(data, preserveBackup);
  });
  ipcMain.handle("app:quit", (event) => {
    authorize(event);
    app.quit();
  });
  ipcMain.handle("display:get-fullscreen", (event) => {
    const window = authorize(event);
    return process.platform === "darwin" ? window.isSimpleFullScreen() : window.isFullScreen();
  });
  ipcMain.handle("display:set-fullscreen", (event, enabled) => {
    const window = authorize(event);
    if (typeof enabled !== "boolean") throw new Error("Invalid display mode");
    if (process.platform === "darwin") window.setSimpleFullScreen(enabled);
    else window.setFullScreen(enabled);
    return enabled;
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
