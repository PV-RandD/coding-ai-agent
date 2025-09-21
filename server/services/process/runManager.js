const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { getStorageDir } = require("../../storage");

class RunManager {
  constructor() {
    this.running = new Map(); // id -> child_process
    this.logFiles = new Map(); // id -> logFilePath
  }

  getLogPath(id) {
    return this.logFiles.get(id) || path.join(getStorageDir() || "", ".logs", `${id}.log`);
  }

  _resolveCommand(item) {
    const filePath = item.filePath;
    const lower = (item.name || "").toLowerCase();
    if (lower.endsWith(".py")) return `python3 "${filePath}"`;
    if (lower.endsWith(".sh")) return `bash "${filePath}"`;
    if (lower.endsWith(".js")) return `node "${filePath}"`;
    if (lower.endsWith(".ts")) return `npx ts-node --transpile-only "${filePath}"`;
    if (lower.endsWith(".rb")) return `ruby "${filePath}"`;
    if (lower.endsWith(".php")) return `php "${filePath}"`;
    if (lower.endsWith(".go")) return `go run "${filePath}"`;
    if (lower.endsWith(".java")) {
      const dir = path.dirname(filePath);
      const base = path.basename(filePath, ".java");
      return `cd "${dir}" && javac "${base}.java" && java ${base}`;
    }
    if (lower.endsWith(".kt")) {
      const dir = path.dirname(filePath);
      return `cd "${dir}" && kotlinc "${path.basename(filePath)}" -include-runtime -d out.jar && java -jar out.jar`;
    }
    if (lower.endsWith(".swift")) return `swift "${filePath}"`;
    if (lower.endsWith(".ps1")) return `pwsh -File "${filePath}"`;
    if (lower.endsWith(".pl")) return `perl "${filePath}"`;
    if (lower.endsWith(".rs")) return `rustc "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
    return `bash "${filePath}"`;
  }

  async run(item) {
    const command = this._resolveCommand(item);
    const child = spawn(command, { shell: "/bin/bash" });
    this.running.set(item.id, child);

    // Prepare log file
    const logsDir = path.join(getStorageDir(), ".logs");
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch {}
    const logPath = path.join(logsDir, `${item.id}.log`);
    try { fs.writeFileSync(logPath, "", "utf8"); } catch {}
    this.logFiles.set(item.id, logPath);

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => {
        const s = d.toString();
        stdout += s;
        try { fs.appendFileSync(logPath, s); } catch {}
      });
      child.stderr.on("data", (d) => {
        const s = d.toString();
        stderr += s;
        try { fs.appendFileSync(logPath, s); } catch {}
      });
      child.on("error", (e) => {
        stderr += `\n${String(e)}`;
      });
      child.on("close", (code, signal) => {
        this.running.delete(item.id);
        try { fs.appendFileSync(logPath, "\n"); } catch {}
        const suggestions = [];
        const err = String(stderr || "");
        if (code !== 0 || signal) {
          if (/not found|command not found/i.test(err)) suggestions.push("Install missing dependency or check PATH.");
          if (/permission denied/i.test(err)) suggestions.push("Make the script executable or run with proper permissions.");
          if (/syntax/i.test(err)) suggestions.push("Check for syntax errors; run a linter or fix indentation.");
          const lower = (item.name || "").toLowerCase();
          if (lower.endsWith(".py") && /module not found/i.test(err)) suggestions.push("Install required Python packages with pip.");
          if (signal) suggestions.push(`Process stopped (signal ${signal}).`);
        }
        resolve({ ok: code === 0 && !signal, code: code ?? 0, stdout, stderr, suggestions });
      });
    });
  }

  stop(id) {
    const child = this.running.get(id);
    if (!child) return false;
    try { child.kill("SIGTERM"); } catch {}
    setTimeout(() => { if (!child.killed) { try { child.kill("SIGKILL"); } catch {} } }, 1000);
    return true;
  }
}

const runManager = new RunManager();
module.exports = { runManager };
