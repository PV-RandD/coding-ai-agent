const express = require("express");
const fs = require("fs");
const path = require("path");
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

function scriptsRouter({ openaiClient }) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      if (!getStorageDir())
        return res
          .status(400)
          .json({ error: "Storage directory not selected" });
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== "string")
        return res.status(400).json({ error: "prompt is required" });
      // Determine OpenAI client: prefer header key override, else env client
      let client = openaiClient;
      const headerKey = req.headers["x-openai-key"];
      if (headerKey && typeof headerKey === "string" && headerKey.trim()) {
        client = new (require("openai"))({ apiKey: headerKey.trim() });
      }
      if (!client)
        return res.status(500).json({ error: "OPENAI_API_KEY is not set" });

      const sys =
        "You generate a very short, runnable script in the most appropriate language for the user's request, and a one-paragraph explanation. Prefer common CLIs and standard runtimes. Include a proper filename with extension.";
      const userMsg = `Generate a concise script and an explanation for: ${prompt}\nReturn strict JSON with keys: name, code, explanation.\nRules:\n- name must be a valid filename including file extension (e.g., script.py, tool.sh, app.js, Main.java).\n- code must be runnable with common tooling. Avoid external dependencies unless essential.`;

      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg },
        ],
        temperature: 0.2,
      });
      const content = completion.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch)
        return res
          .status(502)
          .json({ error: "Model returned unexpected format" });
      const generated = JSON.parse(jsonMatch[0]);

      let name = String(generated.name || "script");
      const code = normalizeCode(generated.code || "");
      const explanation = String(generated.explanation || "");

      let extFromName = (path.extname(name || "") || "").toLowerCase();
      const strong = detectStrongExtension(code);
      const hinted = inferExtFromHints(name, prompt);
      let ext =
        strong && allowedExtensions.has(strong)
          ? strong
          : hinted && allowedExtensions.has(hinted)
          ? hinted
          : allowedExtensions.has(extFromName)
          ? extFromName
          : "";
      if (!ext) {
        const g = guessExtension(code, `${name} ${explanation} ${prompt}`);
        ext = allowedExtensions.has(g) ? g : ".txt";
      }
      const base =
        slugify(
          path.basename(name, extFromName || ext) || explanation || prompt
        ) || "script";
      name = `${base}${ext}`;

      ensureStorage();
      const id = generateId();
      const filePath = path.join(getScriptsDir(), name);
      fs.writeFileSync(filePath, code, "utf8");

      const createdAt = new Date().toISOString();
      const idx = loadIndex();
      idx.scripts.push({
        id,
        name,
        filePath,
        explanation,
        tags: [],
        createdAt,
      });
      saveIndex(idx);

      return res.json({ _id: id, name, explanation, tags: [], createdAt });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  });

  router.get("/", async (_req, res) => {
    try {
      if (!getStorageDir()) return res.json([]);
      const idx = loadIndex();
      const items = (idx.scripts || [])
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((s) => ({
          _id: s.id,
          name: s.name,
          createdAt: s.createdAt,
          tags: s.tags,
        }));
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      if (!getStorageDir()) return res.status(404).json({ error: "Not found" });
      const idx = loadIndex();
      const item = (idx.scripts || []).find((s) => s.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Not found" });
      let code = "";
      try {
        code = fs.readFileSync(item.filePath, "utf8");
      } catch {}
      res.json({
        _id: item.id,
        name: item.name,
        explanation: item.explanation,
        tags: item.tags,
        createdAt: item.createdAt,
        code,
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      if (!getStorageDir()) return res.status(404).json({ error: "Not found" });
      const { code } = req.body || {};
      if (typeof code !== "string")
        return res.status(400).json({ error: "code is required" });
      const idx = loadIndex();
      const item = (idx.scripts || []).find((s) => s.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Not found" });
      fs.writeFileSync(item.filePath, code, "utf8");
      return res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  router.post("/:id/run", async (req, res) => {
    try {
      if (!getStorageDir()) return res.status(404).json({ error: "Not found" });
      const idx = loadIndex();
      const item = (idx.scripts || []).find((s) => s.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Not found" });
      const { exec } = require("child_process");
      const filePath = item.filePath;
      const lower = (item.name || "").toLowerCase();
      let command = "";
      if (lower.endsWith(".py")) command = `python3 "${filePath}"`;
      else if (lower.endsWith(".sh")) command = `bash "${filePath}"`;
      else if (lower.endsWith(".js")) command = `node "${filePath}"`;
      else if (lower.endsWith(".ts"))
        command = `npx ts-node --transpile-only "${filePath}"`;
      else if (lower.endsWith(".rb")) command = `ruby "${filePath}"`;
      else if (lower.endsWith(".php")) command = `php "${filePath}"`;
      else if (lower.endsWith(".go")) command = `go run "${filePath}"`;
      else if (lower.endsWith(".java")) {
        const dir = path.dirname(filePath);
        const base = path.basename(filePath, ".java");
        command = `cd "${dir}" && javac "${base}.java" && java ${base}`;
      } else if (lower.endsWith(".kt")) {
        const dir = path.dirname(filePath);
        command = `cd "${dir}" && kotlinc "${path.basename(
          filePath
        )}" -include-runtime -d out.jar && java -jar out.jar`;
      } else if (lower.endsWith(".swift")) command = `swift "${filePath}"`;
      else if (lower.endsWith(".ps1")) command = `pwsh -File "${filePath}"`;
      else if (lower.endsWith(".pl")) command = `perl "${filePath}"`;
      else if (lower.endsWith(".rs"))
        command = `rustc "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
      else command = `bash "${filePath}"`;
      exec(command, { shell: "/bin/zsh" }, (error, stdout, stderr) => {
        const suggestions = [];
        const err = String(stderr || (error ? error.message : ""));
        if (error) {
          if (/not found|command not found/i.test(err))
            suggestions.push("Install missing dependency or check PATH.");
          if (/permission denied/i.test(err))
            suggestions.push(
              "Make the script executable or run with proper permissions."
            );
          if (/syntax/i.test(err))
            suggestions.push(
              "Check for syntax errors; run a linter or fix indentation."
            );
          if (lower.endsWith(".py") && /module not found/i.test(err))
            suggestions.push("Install required Python packages with pip.");
        }
        res.json({
          ok: !error,
          code: error ? error.code : 0,
          stdout,
          stderr,
          suggestions,
        });
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return router;
}

module.exports = { scriptsRouter };
