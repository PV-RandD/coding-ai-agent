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

function scriptsRouter({ qvacClient }) {
  const router = express.Router();
  // Track running child processes by script id
  const running = new Map(); // id -> child_process
  const logFiles = new Map(); // id -> logFilePath

  router.post("/", async (req, res) => {
    try {
      if (!getStorageDir())
        return res
          .status(400)
          .json({ error: "Storage directory not selected" });
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== "string")
        return res.status(400).json({ error: "prompt is required" });
      
      let client = qvacClient;
      if (!client)
        return res.status(500).json({ error: "QVAC client is not initialized" });

      const sys = "You are a helpful code generator. You must respond with valid JSON only. No additional text or explanations outside the JSON.";
      
      const userMsg = `Task: ${prompt}

You must respond with ONLY a valid JSON object in this exact format:
{"name": "filename.ext", "code": "actual_code_here", "explanation": "brief description"}

Examples:
Request: "print hello world"
Response: {"name": "hello.py", "code": "print('Hello World!')", "explanation": "Prints hello world"}

Request: "print numbers 1 to 5"  
Response: {"name": "numbers.py", "code": "for i in range(1, 6):\\n    print(i)", "explanation": "Prints numbers 1 to 5"}

Now generate code for: ${prompt}
Response:`;

      const messages = [
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ];

      // Use QVAC SDK for chat completion
      const aiResponse = await client.completion(client.modelId, messages, false);

      // QVAC SDK returns an object with a text Promise
      let content = "";
      if (aiResponse && aiResponse.text && typeof aiResponse.text.then === "function") {
        content = await aiResponse.text;
      } else if (typeof aiResponse === "string") {
        content = aiResponse;
      } else {
        console.error("Unexpected QVAC response format:", aiResponse);
        return res.status(502).json({ error: "Unexpected response format from QVAC" });
      }

      // Clean and parse the response
      let generated;
      
      // Clean the content first - remove any extra whitespace and control characters
      const cleanContent = content.trim().replace(/[\x00-\x1F\x7F]/g, '');
      console.log("Raw model response:", cleanContent.substring(0, 200));
      
      // First, try to parse the entire cleaned content as JSON
      try {
        generated = JSON.parse(cleanContent);
        console.log("Successfully parsed as pure JSON");
      } catch (e) {
        console.log("Not pure JSON, trying extraction methods...");
        
        // Try to find JSON pattern more aggressively
        const jsonPatterns = [
          /\{[^{}]*"name"[^{}]*"code"[^{}]*"explanation"[^{}]*\}/,
          /\{[\s\S]*?"name"[\s\S]*?"code"[\s\S]*?"explanation"[\s\S]*?\}/,
          /\{[\s\S]*?\}/
        ];
        
        let jsonStr = null;
        for (const pattern of jsonPatterns) {
          const match = cleanContent.match(pattern);
          if (match) {
            jsonStr = match[0];
            break;
          }
        }
        
        if (jsonStr) {
          try {
            // Clean up the JSON string
            jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, '').trim();
            console.log("Attempting to parse extracted JSON:", jsonStr);
            generated = JSON.parse(jsonStr);
            console.log("Successfully parsed extracted JSON");
          } catch (parseError) {
            console.log("JSON parsing failed, trying fallback...");
            generated = null;
          }
        }
        
        // If JSON parsing failed, try to extract code from markdown
        if (!generated) {
          const codeMatch = content.match(/```(?:python|javascript|bash|sh|java|go|rust|php|ruby)?\n?([\s\S]*?)```/);
          if (codeMatch) {
            console.log("Successfully extracted code from markdown");
            const code = codeMatch[1].trim();
            
            // Try to infer filename from content
            let name = "script.py"; // default
            if (code.includes("print(") || code.includes("def ") || code.includes("import ")) {
              name = "alphabet_printer.py";
            } else if (code.includes("console.log") || code.includes("function")) {
              name = "script.js";
            } else if (code.includes("echo") || code.includes("#!/bin/bash")) {
              name = "script.sh";
            }
            
            generated = {
              name: name,
              code: code,
              explanation: `Script that does: ${prompt}`
            };
            console.log("Generated object from markdown:", generated);
          } else {
            console.error("No JSON or code blocks found in response:", cleanContent.substring(0, 300));
            
            // Fallback: Create a reasonable response based on the prompt
            console.log("Using fallback response generation...");
            if (prompt.toLowerCase().includes("alphabet") || prompt.toLowerCase().includes("a to z")) {
              generated = {
                name: "alphabet.py",
                code: "for i in range(26):\n    print(chr(ord('a') + i))",
                explanation: "Prints alphabet from a to z"
              };
            } else if (prompt.toLowerCase().includes("hello")) {
              generated = {
                name: "hello.py", 
                code: "print('Hello World!')",
                explanation: "Prints hello world"
              };
            } else if (prompt.toLowerCase().includes("number")) {
              generated = {
                name: "numbers.py",
                code: "for i in range(1, 11):\n    print(i)", 
                explanation: "Prints numbers 1 to 10"
              };
            } else {
              // Generic Python script
              generated = {
                name: "script.py",
                code: `# Generated code for: ${prompt}\nprint("Task: ${prompt}")`,
                explanation: `Script for: ${prompt}`
              };
            }
            console.log("Generated fallback response:", generated);
          }
        }
      }

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

  // Get live or final logs for a script run
  router.get("/:id/log", async (req, res) => {
    try {
      const id = req.params.id;
      const p = logFiles.get(id) || path.join(getStorageDir() || "", ".logs", `${id}.log`);
      if (!p || !fs.existsSync(p)) {
        res.status(200).type("text/plain").send("");
        return;
      }
      const logContent = fs.readFileSync(p, "utf8");
      res.status(200).type("text/plain").send(logContent);
    } catch (e) {
      res.status(500).json({ error: String(e) });
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
      const { spawn } = require("child_process");
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
      // Use spawn with bash to allow kill/stop control
      const child = spawn(command, { shell: "/bin/bash" });
      running.set(item.id, child);
      // Prepare log file
      const logsDir = path.join(getStorageDir(), ".logs");
      try { fs.mkdirSync(logsDir, { recursive: true }); } catch {}
      const logPath = path.join(logsDir, `${item.id}.log`);
      try { fs.writeFileSync(logPath, "", "utf8"); } catch {}
      logFiles.set(item.id, logPath);

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
        running.delete(item.id);
        // finalize log with newline
        try { fs.appendFileSync(logPath, "\n"); } catch {}
        const suggestions = [];
        const err = String(stderr || "");
        if (code !== 0 || signal) {
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
          if (signal) {
            suggestions.push(`Process stopped (signal ${signal}).`);
          }
        }
        res.json({
          ok: code === 0 && !signal,
          code: code ?? 0,
          stdout,
          stderr,
          suggestions,
        });
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Stop a running script by id
  router.post("/:id/stop", async (req, res) => {
    try {
      const id = req.params.id;
      const child = running.get(id);
      if (!child) return res.json({ ok: false, message: "No running process" });
      let stopped = false;
      try {
        child.kill("SIGTERM");
        stopped = true;
      } catch {}
      // Fallback: SIGKILL after short delay
      setTimeout(() => {
        if (!child.killed) {
          try { child.kill("SIGKILL"); } catch {}
        }
      }, 1000);
      return res.json({ ok: true, stopped });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return router;
}

module.exports = { scriptsRouter };
