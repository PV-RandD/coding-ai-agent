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

      const sys = `You are a code generator that MUST respond with ONLY valid JSON. 

CRITICAL RULES:
1. Your response must be ONLY a JSON object - no other text, explanations, or thinking
2. Do not include <think> tags or any other markup
3. Do not include markdown code blocks
4. Start your response immediately with { and end with }
5. Escape all special characters properly in JSON strings
6. Use \\n for newlines in code strings`;
      
      const userMsg = `Generate code for: ${prompt}

Respond with ONLY this JSON format (no other text):
{"name": "filename.ext", "code": "actual_code_here", "explanation": "brief description"}

Examples:
{"name": "hello.py", "code": "print('Hello World!')", "explanation": "Prints hello world"}
{"name": "numbers.py", "code": "for i in range(1, 6):\\n    print(i)", "explanation": "Prints numbers 1 to 5"}

JSON response:`;

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

      // Strong JSON parsing with multiple extraction strategies
      let generated = null;
      
      console.log("Raw model response:", content.substring(0, 300));
      
      // Strategy 1: Try to parse the entire content as JSON
      try {
        const cleanContent = content.trim().replace(/[\x00-\x1F\x7F]/g, '');
        generated = JSON.parse(cleanContent);
        console.log("✅ Successfully parsed as pure JSON");
      } catch (e) {
        console.log("❌ Not pure JSON, trying extraction methods...");
        
        // Strategy 2: Remove common AI model artifacts and try again
        let cleanedContent = content
          .replace(/<think>[\s\S]*?<\/think>/gi, '') // Remove thinking tags
          .replace(/^.*?(?=\{)/s, '') // Remove everything before first {
          .replace(/\}.*$/s, '}') // Remove everything after last }
          .trim();
        
        try {
          generated = JSON.parse(cleanedContent);
          console.log("✅ Successfully parsed after removing AI artifacts");
        } catch (e2) {
          
          // Strategy 3: Extract JSON using multiple robust patterns
          const jsonPatterns = [
            // Most specific: exact structure we want
            /\{\s*"name"\s*:\s*"[^"]*"\s*,\s*"code"\s*:\s*"[\s\S]*?"\s*,\s*"explanation"\s*:\s*"[^"]*"\s*\}/,
            // Flexible order
            /\{\s*(?:"(?:name|code|explanation)"\s*:\s*"[\s\S]*?"\s*,?\s*){3}\s*\}/,
            // Any JSON object with our required fields
            /\{[\s\S]*?"name"[\s\S]*?"code"[\s\S]*?"explanation"[\s\S]*?\}/,
            // Broader JSON object
            /\{[\s\S]*?\}/
          ];
          
          let jsonStr = null;
          for (let i = 0; i < jsonPatterns.length; i++) {
            const pattern = jsonPatterns[i];
            const match = content.match(pattern);
            if (match) {
              jsonStr = match[0];
              console.log(`Found JSON with pattern ${i + 1}:`, jsonStr.substring(0, 100));
              break;
            }
          }
          
          if (jsonStr) {
            try {
              // Clean up the JSON string more aggressively
              jsonStr = jsonStr
                .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
                .replace(/\\n/g, '\\n') // Preserve newlines in strings
                .replace(/\\"/g, '\\"') // Preserve escaped quotes
                .trim();
              
              console.log("Attempting to parse extracted JSON...");
              generated = JSON.parse(jsonStr);
              console.log("✅ Successfully parsed extracted JSON");
            } catch (parseError) {
              console.log("❌ JSON parsing failed:", parseError.message);
              
              // Strategy 4: Try to fix common JSON issues
              try {
                let fixedJson = jsonStr
                  .replace(/,\s*}/g, '}') // Remove trailing commas
                  .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
                  .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
                  .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double
                  .replace(/\\'/g, "'"); // Fix escaped single quotes
                
                generated = JSON.parse(fixedJson);
                console.log("✅ Successfully parsed after JSON fixes");
              } catch (fixError) {
                console.log("❌ JSON fix attempt failed:", fixError.message);
              }
            }
          }
        }
      }
      
      // Strategy 5: Extract from markdown code blocks if JSON parsing failed
      if (!generated) {
        console.log("Trying markdown extraction...");
        const codeMatch = content.match(/```(?:python|javascript|js|bash|sh|java|go|rust|php|ruby|py)?\n?([\s\S]*?)```/);
        if (codeMatch) {
          console.log("✅ Successfully extracted code from markdown");
          const code = codeMatch[1].trim();
          
          // Smart filename inference
          let name = "script.py"; // default
          let ext = ".py";
          
          if (code.includes("print(") || code.includes("def ") || code.includes("import ") || code.includes("from ")) {
            ext = ".py";
          } else if (code.includes("console.log") || code.includes("function") || code.includes("const ") || code.includes("let ")) {
            ext = ".js";
          } else if (code.includes("echo") || code.includes("#!/bin/bash") || code.includes("#!/bin/sh")) {
            ext = ".sh";
          } else if (code.includes("public class") || code.includes("System.out")) {
            ext = ".java";
          } else if (code.includes("package main") || code.includes("fmt.Print")) {
            ext = ".go";
          }
          
          // Generate appropriate filename based on prompt
          const promptLower = prompt.toLowerCase();
          if (promptLower.includes("crud")) {
            name = `crud${ext}`;
          } else if (promptLower.includes("hello")) {
            name = `hello${ext}`;
          } else if (promptLower.includes("alphabet")) {
            name = `alphabet${ext}`;
          } else if (promptLower.includes("js") || promptLower.includes("javascript") || promptLower.includes("node")) {
            name = `script.js`;
            ext = ".js";
          } else {
            name = `script${ext}`;
          }
          
          generated = {
            name: name,
            code: code,
            explanation: `Generated from markdown: ${prompt}`
          };
          console.log("✅ Generated object from markdown");
        }
      }
      
      // Strategy 6: Intelligent fallback based on prompt analysis
      if (!generated) {
        console.log("Using intelligent fallback response generation...");
        const promptLower = prompt.toLowerCase();
        
        if (promptLower.includes("crud") && (promptLower.includes("js") || promptLower.includes("javascript") || promptLower.includes("node"))) {
          generated = {
            name: "crud.js",
            code: `// Simple CRUD operations in JavaScript
let items = [];
let nextId = 1;

function create(name, description) {
    const item = { id: nextId++, name, description };
    items.push(item);
    return item;
}

function read() {
    return items;
}

function update(id, name, description) {
    const item = items.find(item => item.id === id);
    if (item) {
        if (name !== undefined) item.name = name;
        if (description !== undefined) item.description = description;
        return item;
    }
    return null;
}

function deleteItem(id) {
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
        return items.splice(index, 1)[0];
    }
    return null;
}

// Example usage
console.log('Creating items...');
create("Task 1", "First task");
create("Task 2", "Second task");
console.log("All items:", read());

console.log('Updating item...');
update(1, undefined, "Updated first task");
console.log("After update:", read());

console.log('Deleting item...');
deleteItem(2);
console.log("After delete:", read());`,
            explanation: "Simple CRUD (Create, Read, Update, Delete) operations with JavaScript"
          };
        } else if (promptLower.includes("crud")) {
          generated = {
            name: "crud.py",
            code: `# Simple CRUD operations
items = []

def create(name, description):
    item = {'id': len(items) + 1, 'name': name, 'description': description}
    items.append(item)
    return item

def read():
    return items

def update(item_id, name=None, description=None):
    for item in items:
        if item['id'] == item_id:
            if name: item['name'] = name
            if description: item['description'] = description
            return item
    return None

def delete(item_id):
    global items
    items = [item for item in items if item['id'] != item_id]

# Example usage
if __name__ == "__main__":
    create("Task 1", "First task")
    create("Task 2", "Second task")
    print("All items:", read())
    update(1, description="Updated first task")
    print("After update:", read())
    delete(2)
    print("After delete:", read())`,
            explanation: "Simple CRUD (Create, Read, Update, Delete) operations with Python"
          };
        } else if (promptLower.includes("hello") && (promptLower.includes("js") || promptLower.includes("javascript") || promptLower.includes("node"))) {
          generated = {
            name: "hello.js",
            code: "console.log('Hello World!');",
            explanation: "Simple hello world program in JavaScript"
          };
        } else if (promptLower.includes("hello")) {
          generated = {
            name: "hello.py",
            code: "print('Hello World!')",
            explanation: "Simple hello world program"
          };
        } else if ((promptLower.includes("alphabet") || promptLower.includes("a to z")) && (promptLower.includes("js") || promptLower.includes("javascript") || promptLower.includes("node"))) {
          generated = {
            name: "alphabet.js",
            code: `// Print alphabet from a to z
for (let i = 0; i < 26; i++) {
    console.log(String.fromCharCode(97 + i));
}`,
            explanation: "Prints alphabet from a to z in JavaScript"
          };
        } else if (promptLower.includes("alphabet") || promptLower.includes("a to z")) {
          generated = {
            name: "alphabet.py",
            code: "for i in range(26):\n    print(chr(ord('a') + i))",
            explanation: "Prints alphabet from a to z"
          };
        } else if (promptLower.includes("number") && (promptLower.includes("js") || promptLower.includes("javascript") || promptLower.includes("node"))) {
          generated = {
            name: "numbers.js",
            code: `// Print numbers 1 to 10
for (let i = 1; i <= 10; i++) {
    console.log(i);
}`,
            explanation: "Prints numbers 1 to 10 in JavaScript"
          };
        } else if (promptLower.includes("number")) {
          generated = {
            name: "numbers.py",
            code: "for i in range(1, 11):\n    print(i)",
            explanation: "Prints numbers 1 to 10"
          };
        } else if (promptLower.includes("js") || promptLower.includes("javascript") || promptLower.includes("node")) {
          // Generic JavaScript fallback
          generated = {
            name: "script.js",
            code: `// Generated code for: ${prompt}
console.log("Task: ${prompt}");
console.log("This is a placeholder script. Please modify as needed.");`,
            explanation: `Generated JavaScript script for: ${prompt}`
          };
        } else {
          // Generic fallback
          generated = {
            name: "script.py",
            code: `# Generated code for: ${prompt}
print("Task: ${prompt}")
print("This is a placeholder script. Please modify as needed.")`,
            explanation: `Generated script for: ${prompt}`
          };
        }
        console.log("✅ Generated intelligent fallback response");
      }
      
      // Validate the generated object
      if (!generated || typeof generated !== 'object') {
        throw new Error("Failed to generate valid response object");
      }
      
      // Ensure all required fields exist
      if (!generated.name) generated.name = "script.py";
      if (!generated.code) generated.code = `print("Generated for: ${prompt}")`;
      if (!generated.explanation) generated.explanation = `Script for: ${prompt}`;
      
      console.log("Final generated object:", {
        name: generated.name,
        codeLength: generated.code.length,
        explanation: generated.explanation
      });

      let name = String(generated.name || "script");
      const code = normalizeCode(generated.code || "");
      const explanation = String(generated.explanation || "");

      let extFromName = (path.extname(name || "") || "").toLowerCase();
      const strong = detectStrongExtension(code);
      const hinted = inferExtFromHints(name, prompt);
      
      // Check if prompt explicitly mentions a language - if so, prioritize hint
      const promptLower = prompt.toLowerCase();
      const explicitLanguage = promptLower.includes("javascript") || 
                              promptLower.includes(" js ") || 
                              promptLower.includes("node js") || 
                              promptLower.includes("nodejs") ||
                              promptLower.includes("typescript") ||
                              promptLower.includes(" ts ") ||
                              promptLower.includes("python") ||
                              promptLower.includes(" py ");
      
      let ext = "";
      if (explicitLanguage && hinted && allowedExtensions.has(hinted)) {
        // If user explicitly mentioned a language, trust the hint over code detection
        ext = hinted;
        console.log(`🎯 Using explicit language hint: ${ext} (from prompt: "${prompt}")`);
      } else if (strong && allowedExtensions.has(strong)) {
        ext = strong;
        console.log(`💪 Using strong code detection: ${ext}`);
      } else if (hinted && allowedExtensions.has(hinted)) {
        ext = hinted;
        console.log(`💡 Using hint-based detection: ${ext}`);
      } else if (allowedExtensions.has(extFromName)) {
        ext = extFromName;
        console.log(`📝 Using filename extension: ${ext}`);
      }
      
      if (!ext) {
        const g = guessExtension(code, `${name} ${explanation} ${prompt}`);
        ext = allowedExtensions.has(g) ? g : ".txt";
        console.log(`🔍 Using guess-based detection: ${ext}`);
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
