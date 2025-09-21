const express = require("express");
const { normalizeCode } = require("../utils/codeUtils");

function aiRouter({ qvacClient }) {
  const router = express.Router();

  router.post("/transform", async (req, res) => {
    try {
      let client = qvacClient;
      if (!client)
        return res.status(500).json({ error: "QVAC client is not initialized" });

      const { prompt, code, name } = req.body || {};
      if (typeof prompt !== "string" || typeof code !== "string")
        return res.status(400).json({ error: "prompt and code are required" });
      
      const sys =
        "You are a code editor. Apply the user's request to the provided code. You must respond with ONLY valid JSON containing 'code' and 'explanation' keys. No additional text.";
      const userMsg = `Filename: ${
        name || "unknown"
      }\n\nUser request:\n${prompt}\n\nCurrent code:\n\n\`\`\`\n${code}\n\`\`\``;
      
      const messages = [
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ];

      // Use QVAC SDK for chat completion
      const response = await client.completion(client.modelId, messages, false);
      
      // QVAC SDK returns an object with a text Promise
      let content = "";
      if (response && response.text && typeof response.text.then === "function") {
        content = await response.text;
      } else if (typeof response === "string") {
        content = response;
      } else {
        console.error("Unexpected QVAC response format:", response);
        return res.status(502).json({ error: "Unexpected response format from QVAC" });
      }
      
      // Clean and parse response similar to scripts router
      const cleanContent = content.trim().replace(/[\x00-\x1F\x7F]/g, '');
      let out;
      
      try {
        out = JSON.parse(cleanContent);
      } catch (e) {
        const jsonMatch = cleanContent.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          return res.status(502).json({ error: "Model returned unexpected format" });
        }
        try {
          out = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          return res.status(502).json({ error: "Failed to parse model response" });
        }
      }
      
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
