const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const OpenAI = require("openai");
const { getStorageDir, loadIndex } = require("./storage");
const { scriptsRouter } = require("./routes/scripts");
const { aiRouter } = require("./routes/ai");

function createApiServer() {
  const api = express();
  api.use(cors());
  api.use(bodyParser.json({ limit: "1mb" }));

  const client = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  // Mount modular routers
  api.use("/api/scripts", scriptsRouter({ openaiClient: client }));
  api.use("/api/ai", aiRouter({ openaiClient: client }));

  // Keep search in this file (reads index for previews)
  api.get("/api/search", async (req, res) => {
    try {
      const q = String(req.query.q || "").toLowerCase();
      if (!q || !getStorageDir()) return res.json([]);
      const items = loadIndex().scripts || [];
      function score(s) {
        let code = "";
        try {
          code = fs.readFileSync(s.filePath, "utf8");
        } catch {}
        const hay = `${s.name} ${s.explanation} ${
          s.tags?.join(" ") || ""
        } ${code}`.toLowerCase();
        let sc = 0;
        q.split(/\s+/).forEach((t) => {
          if (!t) return;
          if (hay.includes(t)) sc += 2;
          if ((s.name || "").toLowerCase().includes(t)) sc += 3;
          if ((s.tags || []).some((tg) => String(tg).toLowerCase().includes(t)))
            sc += 2;
        });
        return sc;
      }
      const ranked = items
        .map((s) => {
          let code = "";
          try {
            code = fs.readFileSync(s.filePath, "utf8");
          } catch {}
          return {
            ...s,
            _score: score(s),
            codePreview: code.split(/\n/).slice(0, 12).join("\n"),
            explanationPreview: (s.explanation || "").slice(0, 240),
          };
        })
        .filter((s) => s._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 50);
      res.json(
        ranked.map((s) => ({
          _id: s.id,
          name: s.name,
          createdAt: s.createdAt,
          tags: s.tags,
          codePreview: s.codePreview,
          explanationPreview: s.explanationPreview,
        }))
      );
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return api;
}

module.exports = { createApiServer };
