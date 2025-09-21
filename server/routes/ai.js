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
      console.log("AI Transform raw response:", content);
      console.log("AI Transform cleaned response:", cleanContent);
      
      let out;
      
      try {
        out = JSON.parse(cleanContent);
      } catch (e) {
        console.log("Initial JSON parse failed:", e.message);
        
        // Try to extract JSON from the response
        const jsonMatch = cleanContent.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          console.log("No JSON found in response");
          return res.status(502).json({ 
            error: "Model returned unexpected format", 
            response: cleanContent.slice(0, 200) 
          });
        }
        
        try {
          out = JSON.parse(jsonMatch[0]);
          console.log("Successfully parsed extracted JSON:", out);
        } catch (parseError) {
          console.log("Failed to parse extracted JSON:", parseError.message);
          console.log("Extracted JSON:", jsonMatch[0]);
          
          // Last resort: try to fix common JSON issues
          let fixedJson = jsonMatch[0];
          
          // Fix incomplete JSON by adding missing closing braces
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          if (openBraces > closeBraces) {
            fixedJson += '}';
          }
          
          // Fix incomplete strings
          if (fixedJson.includes('"code":') && !fixedJson.includes('"explanation":')) {
            fixedJson = fixedJson.replace(/,$/, '') + ', "explanation": "Code modification"}';
          }
          
          try {
            out = JSON.parse(fixedJson);
            console.log("Successfully parsed fixed JSON:", out);
          } catch (finalError) {
            console.log("All JSON parsing attempts failed");
            
            // Ultimate fallback: return the original code with an error explanation
            return res.json({ 
              code: code, // Return original code unchanged
              explanation: "AI response was malformed. Original code preserved. Please try again with a simpler request."
            });
          }
        }
      }
      
      // Validate the parsed JSON has required fields
      if (!out || typeof out !== 'object') {
        console.log("Parsed output is not a valid object:", out);
        return res.json({ 
          code: code, 
          explanation: "AI response was invalid. Original code preserved."
        });
      }
      
      // Ensure we have at least some content
      const newCode = normalizeCode(out.code || code); // Fallback to original code
      const explanation = String(out.explanation || "Code processed by AI");
      
      console.log("Final response:", { code: newCode.slice(0, 100) + "...", explanation });
      res.json({ code: newCode, explanation });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return router;
}

module.exports = { aiRouter };
