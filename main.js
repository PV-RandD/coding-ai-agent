require("dotenv").config();
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  nativeImage,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { setStorageDir, getStorageDir } = require("./server/storage");

/** In-memory simple index: [{ path, name, tags, mtimeMs, size }] */
let simpleIndex = [];

function resolveAssetPath(fileName) {
  // In production, packaged apps load assets from resourcesPath
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  const p = path.join(base, "assets", fileName);
  if (fs.existsSync(p)) return p;
  // Fallback: try __dirname regardless
  const local = path.join(__dirname, "assets", fileName);
  if (fs.existsSync(local)) return local;
  return null;
}

const createLoadingWindow = () => {
  const iconName =
    process.platform === "darwin"
      ? "icon.icns"
      : process.platform === "win32"
      ? "icon.ico"
      : "icon.png";
  const appIconPath = resolveAssetPath(iconName);

  const loadingWin = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    icon: appIconPath || undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Handle loading screen path for both development and production
  let loadingHtml;
  if (app.isPackaged) {
    // In packaged app, loading.html should be in the same directory as main.js
    loadingHtml = path.join(__dirname, "loading.html");
  } else {
    // In development, loading.html is in the root directory
    loadingHtml = path.join(__dirname, "loading.html");
  }
  
  loadingWin.loadFile(loadingHtml).catch((e) => {
    console.error("Failed to load loading screen:", e);
    // Fallback: create a simple loading window with basic HTML
    loadingWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head><title>Loading...</title></head>
      <body style="margin:0;padding:40px;background:#667eea;color:white;font-family:Arial;text-align:center;">
        <h1>🤖 Initializing QVAC...</h1>
        <p>Please wait while the AI engine loads...</p>
      </body>
      </html>
    `)}`);
  });
  
  return loadingWin;
};

const createWindow = () => {
  const iconName =
    process.platform === "darwin"
      ? "icon.icns"
      : process.platform === "win32"
      ? "icon.ico"
      : "icon.png";
  const appIconPath = resolveAssetPath(iconName);

  console.log("appIconPath", appIconPath);

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: appIconPath || undefined,
    show: false, // Don't show immediately
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (app.isPackaged) {
    const indexHtml = path.join(__dirname, "renderer", "dist", "index.html");
    win.loadFile(indexHtml).catch((e) => {
      console.error("Failed to load packaged UI:", e);
    });
  } else {
    win.loadURL("http://localhost:5173");
  }
  
  // Show window when ready
  win.once('ready-to-show', () => {
    win.show();
  });
  
  return win;
};

// Global variable to track QVAC initialization status
let qvacInitialized = false;
let qvacInitPromise = null;

app.whenReady().then(async () => {
  console.log(`[STARTUP] App ready. Packaged: ${app.isPackaged}`);
  
  // Set macOS dock icon if available
  try {
    if (process.platform === "darwin") {
      const icnsPath = resolveAssetPath("icon.icns");
      if (icnsPath && fs.existsSync(icnsPath) && app.dock && app.dock.setIcon) {
        const img = nativeImage.createFromPath(icnsPath);
        if (!img.isEmpty()) app.dock.setIcon(img);
      }
    }
  } catch {}
  
  // Show loading screen first
  console.log("[STARTUP] Showing loading screen...");
  const loadingWindow = createLoadingWindow();
  
  try {
    // Wait for QVAC initialization before creating the main window
    console.log("[STARTUP] Waiting for QVAC initialization to complete...");
    await waitForQvacInitialization();
    console.log("[STARTUP] QVAC initialization complete. Creating main window...");
    
    // Create main window
    const mainWindow = createWindow();
    
    // Close loading window after main window is ready
    mainWindow.once('ready-to-show', () => {
      console.log("[STARTUP] Main window ready, closing loading screen");
      loadingWindow.close();
    });
    
  } catch (error) {
    console.error("[STARTUP] Failed to initialize QVAC:", error);
    // Show error and close loading window
    loadingWindow.close();
    
    // Create main window anyway but show error
    const mainWindow = createWindow();
    mainWindow.once('ready-to-show', () => {
      // You could show an error dialog here if needed
      console.error("[STARTUP] App started without QVAC initialization");
    });
  }
});

// IPC: run shell command (optionally in a provided cwd)
ipcMain.handle("run-command", async (_event, payload) => {
  const { cmd, command, cwd } =
    typeof payload === "string" ? { command: payload } : payload || {};
  const actualCmd = typeof command === "string" ? command : typeof cmd === "string" ? cmd : "";
  return new Promise((resolve) => {
    exec(
      actualCmd,
      { shell: "/bin/bash", cwd: cwd && typeof cwd === "string" ? cwd : undefined },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error ? error.code : 0,
          stdout,
          stderr,
          error: error ? String(error) : null,
        });
      }
    );
  });
});

// IPC: choose storage directory
ipcMain.handle("select-storage-dir", async () => {
  const res = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (res.canceled || !res.filePaths?.[0]) return { ok: false };
  const dir = res.filePaths[0];
  setStorageDir(dir);
  return { ok: true, storageDir: dir };
});

ipcMain.handle("get-storage-dir", async () => ({
  ok: !!getStorageDir(),
  storageDir: getStorageDir(),
}));

// IPC: get QVAC initialization status
ipcMain.handle("get-qvac-status", async () => ({
  initialized: qvacInitialized,
  initializing: qvacInitPromise !== null && !qvacInitialized,
}));

// IPC: list directory contents (non-recursive)
ipcMain.handle("list-dir", async (_event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      path: path.join(dirPath, e.name),
      isDirectory: e.isDirectory(),
    }));
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// IPC: read file preview (first N bytes)
ipcMain.handle("read-preview", async (_event, { filePath, bytes = 2048 }) => {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = fs.readSync(fd, buffer, 0, bytes, 0);
    fs.closeSync(fd);
    return { ok: true, content: buffer.toString("utf8", 0, bytesRead) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// IPC: save file
ipcMain.handle("save-file", async (_event, { filePath, content }) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// Helper to walk dir recursively
function walkDir(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    try {
      const stat = fs.statSync(current);
      if (stat.isDirectory()) {
        const names = fs.readdirSync(current);
        for (const name of names) {
          stack.push(path.join(current, name));
        }
      } else {
        results.push({ filePath: current, stat });
      }
    } catch (_) {}
  }
  return results;
}

// IPC: index directory recursively
ipcMain.handle("index-dir", async (_event, dirPath) => {
  try {
    const files = walkDir(dirPath);
    simpleIndex = files.map(({ filePath, stat }) => ({
      path: filePath,
      name: path.basename(filePath),
      tags: [],
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    }));
    return { ok: true, count: simpleIndex.length };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// IPC: simple search over name and path
ipcMain.handle("search-index", async (_event, query) => {
  try {
    const q = String(query || "").toLowerCase();
    const results = simpleIndex.filter(
      (f) =>
        f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// Function to wait for QVAC initialization
async function waitForQvacInitialization() {
  console.log(`[QVAC] Wait called. Initialized: ${qvacInitialized}, Promise exists: ${!!qvacInitPromise}`);
  
  if (qvacInitialized) {
    console.log("[QVAC] Already initialized, returning immediately");
    return Promise.resolve();
  }
  
  if (qvacInitPromise) {
    console.log("[QVAC] Waiting for existing initialization promise");
    return qvacInitPromise;
  }
  
  // If not already started, start the API server initialization
  console.log("[QVAC] Starting new initialization");
  qvacInitPromise = startApiServer();
  return qvacInitPromise;
}

// Start Express API server inside Electron main
async function startApiServer() {
  try {
    const { createApiServer } = require("./server/api");
    console.log("Initializing API server with QVAC client...");
    
    // Broadcast status change: initializing
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send("qvac-status-changed", { 
        initialized: false, 
        initializing: true 
      });
    });
    
    const api = await createApiServer();
    const port = process.env.PORT || 8787;
    
    return new Promise((resolve, reject) => {
      api.listen(port, (err) => {
        if (err) {
          console.error("API failed to start", err);
          // Broadcast status change: failed
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("qvac-status-changed", { 
              initialized: false, 
              initializing: false,
              error: err.message 
            });
          });
          reject(err);
        } else {
          console.log(`[API] Listening on http://localhost:${port}`);
          qvacInitialized = true;
          
          // Broadcast status change: initialized
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("qvac-status-changed", { 
              initialized: true, 
              initializing: false 
            });
          });
          
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("API failed to start", error);
    
    // Broadcast status change: failed
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send("qvac-status-changed", { 
        initialized: false, 
        initializing: false,
        error: error.message 
      });
    });
    
    throw error;
  }
}

// Initialize the API server promise but don't start it immediately
// It will be started when waitForQvacInitialization() is called
