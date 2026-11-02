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
    backgroundColor: "#11121d",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

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
    if (!window || event.senderFrame !== event.sender.mainFrame) throw new Error("Unauthorized save request");
  };
  ipcMain.handle("save:read", (event) => {
    authorize(event);
    return storage.readCandidates();
  });
  ipcMain.handle("save:write", (event, data) => {
    authorize(event);
    return storage.write(data);
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
