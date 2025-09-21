const path = require("path");
const fs = require("fs");
const {
  getStorageDir,
  getScriptsDir,
  ensureStorage,
  loadIndex,
  saveIndex,
  generateId,
} = require("../storage");
const {
  slugify,
  normalizeCode,
  guessExtension,
  detectStrongExtension,
  inferExtFromHints,
  allowedExtensions,
} = require("../utils/codeUtils");
const { generateWithQVAC } = require("../services/ai/generationService");
const { runManager } = require("../services/process/runManager");

class ScriptsController {
  constructor({ qvacClient }) {
    this.qvacClient = qvacClient;
  }

  // POST /api/scripts
  createScript = async (req, res) => {
    try {
      if (!getStorageDir()) {
        return res.status(400).json({ error: "Storage directory not selected" });
      }
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt is required" });
      }
      if (!this.qvacClient) {
        return res.status(500).json({ error: "QVAC client is not initialized" });
      }

      // Generate content using QVAC
      const generated = await generateWithQVAC(this.qvacClient, prompt);

      // Normalize and infer file details
      let name = String(generated.name || "script");
      const code = normalizeCode(generated.code || "");
      const explanation = String(generated.explanation || "");

      let extFromName = (path.extname(name || "") || "").toLowerCase();
      const strong = detectStrongExtension(code);
      const hinted = inferExtFromHints(name, prompt);

      // Check if prompt explicitly mentions a language - if so, prioritize hint
      const promptLower = prompt.toLowerCase();
      const explicitLanguage =
        promptLower.includes("javascript") ||
        promptLower.includes(" js ") ||
        promptLower.includes("node js") ||
        promptLower.includes("nodejs") ||
        promptLower.includes("typescript") ||
        promptLower.includes(" ts ") ||
        promptLower.includes("python") ||
        promptLower.includes(" py ");

      let ext = "";
      if (explicitLanguage && hinted && allowedExtensions.has(hinted)) {
        ext = hinted;
      } else if (strong && allowedExtensions.has(strong)) {
        ext = strong;
      } else if (hinted && allowedExtensions.has(hinted)) {
        ext = hinted;
      } else if (allowedExtensions.has(extFromName)) {
        ext = extFromName;
      }

      if (!ext) {
        const g = guessExtension(code, `${name} ${explanation} ${prompt}`);
        ext = allowedExtensions.has(g) ? g : ".txt";
      }
      const base =
        slugify(path.basename(name, extFromName || ext) || explanation || prompt) ||
        "script";
      name = `${base}${ext}`;

      ensureStorage();
      const id = generateId();
      const filePath = path.join(getScriptsDir(), name);
      fs.writeFileSync(filePath, code, "utf8");

      const createdAt = new Date().toISOString();
      const idx = loadIndex();
      idx.scripts.push({ id, name, filePath, explanation, tags: [], createdAt });
      saveIndex(idx);

      return res.json({ _id: id, name, code, explanation, tags: [], createdAt });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  };

  // GET /api/scripts
  listScripts = async (_req, res) => {
    try {
      if (!getStorageDir()) return res.json([]);
      const idx = loadIndex();
      const items = (idx.scripts || [])
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((s) => ({ _id: s.id, name: s.name, createdAt: s.createdAt, tags: s.tags }));
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  };

  // GET /api/scripts/:id
  getScript = async (req, res) => {
    try {
      if (!getStorageDir()) return res.status(404).json({ error: "Not found" });
      const idx = loadIndex();
      const item = (idx.scripts || []).find((s) => s.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Not found" });
      let code = "";
      try {
        code = fs.readFileSync(item.filePath, "utf8");
      } catch {}
      res.json({ _id: item.id, name: item.name, explanation: item.explanation, tags: item.tags, createdAt: item.createdAt, code });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  };

  // PUT /api/scripts/:id
  updateScript = async (req, res) => {
    try {
      if (!getStorageDir()) return res.status(404).json({ error: "Not found" });
      const { code } = req.body || {};
      if (typeof code !== "string") return res.status(400).json({ error: "code is required" });
      const idx = loadIndex();
      const item = (idx.scripts || []).find((s) => s.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Not found" });
      fs.writeFileSync(item.filePath, code, "utf8");
      return res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  };

  // GET /api/scripts/:id/log
  getLog = async (req, res) => {
    try {
      const id = req.params.id;
      const p = runManager.getLogPath(id) || path.join(getStorageDir() || "", ".logs", `${id}.log`);
      if (!p || !fs.existsSync(p)) {
        res.status(200).type("text/plain").send("");
        return;
      }
      const logContent = fs.readFileSync(p, "utf8");
      res.status(200).type("text/plain").send(logContent);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  };

  // POST /api/scripts/:id/run
  runScript = async (req, res) => {
    try {
      if (!getStorageDir()) return res.status(404).json({ error: "Not found" });
      const idx = loadIndex();
      const item = (idx.scripts || []).find((s) => s.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Not found" });

      const result = await runManager.run(item);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  };

  // POST /api/scripts/:id/stop
  stopScript = async (req, res) => {
    try {
      const id = req.params.id;
      const stopped = runManager.stop(id);
      return res.json({ ok: !!stopped, stopped });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  };
}

module.exports = { ScriptsController };
