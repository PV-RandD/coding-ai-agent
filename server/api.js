const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const { getStorageDir, loadIndex } = require("./storage");
const { scriptsRouter } = require("./routes/scripts");
const { aiRouter } = require("./routes/ai");

// Best available model from your collection - Qwen 3 4B Q4
const DEFAULT_MODEL_URL =
  "pear://19ffb75463149955ee24d786dfddd84d41fc872ea813cd4465f5f7299d165adc/model.gguf";

async function initializeQvacClient() {
  try {
    // Dynamic import of QVAC SDK
    const { loadModel, completion } = await import("@tetherto/qvac-sdk");
    
    console.log("Loading QVAC model...");
    const modelId = await loadModel(DEFAULT_MODEL_URL, {
      modelType: "llm",
      modelConfig: { 
        ctx_size: 8192,
        temperature: 0.1,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        n_predict: 512
      },
      onProgress: (p) => {
        console.log(`QVAC Model loading progress: ${p?.percentage ?? 0}%`);
      },
    });
    
    console.log("QVAC client initialized successfully");
    return { modelId, completion };
  } catch (error) {
    console.error("Failed to initialize QVAC client:", error);
    return null;
  }
}

async function createApiServer() {
  const api = express();
  api.use(cors());
  api.use(bodyParser.json({ limit: "1mb" }));

  // Initialize QVAC client before mounting routes
  const qvacClient = await initializeQvacClient();

  // Mount modular routers with initialized client
  api.use("/api/scripts", scriptsRouter({ qvacClient }));
  api.use("/api/ai", aiRouter({ qvacClient }));

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
