const fs = require("fs");
const path = require("path");

let storageDir = null;

function setStorageDir(dirPath) {
  storageDir = dirPath || null;
  if (storageDir) {
    try {
      fs.mkdirSync(path.join(storageDir, ".coding-ai-agent"), {
        recursive: true,
      });
      fs.mkdirSync(path.join(storageDir, "scripts"), { recursive: true });
    } catch {}
  }
}

function getStorageDir() {
  return storageDir;
}

function getMetaDir() {
  if (!storageDir) return null;
  return path.join(storageDir, ".coding-ai-agent");
}

function getScriptsDir() {
  if (!storageDir) return null;
  return path.join(storageDir, "scripts");
}

function getIndexPath() {
  const meta = getMetaDir();
  if (!meta) return null;
  return path.join(meta, "index.json");
}

function ensureStorage() {
  if (!storageDir) throw new Error("Storage directory not selected");
  fs.mkdirSync(getMetaDir(), { recursive: true });
  fs.mkdirSync(getScriptsDir(), { recursive: true });
}

function loadIndex() {
  ensureStorage();
  const p = getIndexPath();
  if (!fs.existsSync(p)) return { scripts: [] };
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return { scripts: [] };
  }
}

function saveIndex(idx) {
  ensureStorage();
  fs.writeFileSync(getIndexPath(), JSON.stringify(idx, null, 2), "utf8");
}

function generateId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toLowerCase();
}

module.exports = {
  setStorageDir,
  getStorageDir,
  getMetaDir,
  getScriptsDir,
  getIndexPath,
  ensureStorage,
  loadIndex,
  saveIndex,
  generateId,
};
