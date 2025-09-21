const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  runCommand: (command) => ipcRenderer.invoke("run-command", command),
  listDir: (dirPath) => ipcRenderer.invoke("list-dir", dirPath),
  readPreview: (filePath, bytes = 2048) =>
    ipcRenderer.invoke("read-preview", { filePath, bytes }),
  saveFile: (options) => ipcRenderer.invoke("save-file", options),
  indexDir: (dirPath) => ipcRenderer.invoke("index-dir", dirPath),
  searchIndex: (query) => ipcRenderer.invoke("search-index", query),
  selectStorageDir: () => ipcRenderer.invoke("select-storage-dir"),
  getStorageDir: () => ipcRenderer.invoke("get-storage-dir"),
  // QVAC related APIs
  getQvacStatus: () => ipcRenderer.invoke("get-qvac-status"),
  onQvacStatusChange: (callback) => {
    ipcRenderer.on("qvac-status-changed", callback);
    // Return cleanup function
    return () => ipcRenderer.removeListener("qvac-status-changed", callback);
  },
});
