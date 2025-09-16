const express = require("express");
const { normalizeCode } = require("../utils/codeUtils");

function aiRouter({ openaiClient }) {
  const router = express.Router();

  router.post("/transform", async (req, res) => {
    try {
      let client = openaiClient;
      // Allow client-provided key (from settings) to override
      const headerKey = req.headers["x-openai-key"]; // send from renderer if set
      if (headerKey && typeof headerKey === "string" && headerKey.trim()) {
        client = new (require("openai"))({ apiKey: headerKey.trim() });
      }
      if (!client)
        return res.status(500).json({ error: "OPENAI_API_KEY is not set" });

      const { prompt, code, name } = req.body || {};
      if (typeof prompt !== "string" || typeof code !== "string")
        return res.status(400).json({ error: "prompt and code are required" });
      const sys =
        "You are a code editor. Apply the user's request to the provided code. Return concise, runnable code and a short explanation. Respond strictly in JSON with keys: code, explanation.";
      const userMsg = `Filename: ${
        name || "unknown"
      }\n\nUser request:\n${prompt}\n\nCurrent code:\n\n\`\`\`\n${code}\n\`\`\``;
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
      const out = JSON.parse(jsonMatch[0]);
      const newCode = normalizeCode(out.code || "");
      const explanation = String(out.explanation || "");
      res.json({ code: newCode, explanation });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return router;
}

module.exports = { aiRouter };
