async function generateWithQVAC(client, prompt) {
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

  const aiResponse = await client.completion(client.modelId, messages, false);

  let content = "";
  if (aiResponse && aiResponse.text && typeof aiResponse.text.then === "function") {
    content = await aiResponse.text;
  } else if (typeof aiResponse === "string") {
    content = aiResponse;
  } else {
    throw new Error("Unexpected response format from QVAC");
  }

  // Strong JSON parsing with multiple extraction strategies
  let generated = null;

  // Strategy 1: Try to parse as pure JSON
  try {
    const cleanContent = content.trim().replace(/[\x00-\x1F\x7F]/g, "");
    generated = JSON.parse(cleanContent);
  } catch (_) {
    // Strategy 2: remove AI artifacts
    let cleanedContent = content
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^.*?(?=\{)/s, "")
      .replace(/\}.*$/s, "}")
      .trim();
    try {
      generated = JSON.parse(cleanedContent);
    } catch (_) {
      // Strategy 3: patterns
      const jsonPatterns = [
        /\{\s*"name"\s*:\s*"[^"]*"\s*,\s*"code"\s*:\s*"[\s\S]*?"\s*,\s*"explanation"\s*:\s*"[^"]*"\s*\}/,
        /\{\s*(?:"(?:name|code|explanation)"\s*:\s*"[\s\S]*?"\s*,?\s*){3}\s*\}/,
        /\{[\s\S]*?"name"[\s\S]*?"code"[\s\S]*?"explanation"[\s\S]*?\}/,
        /\{[\s\S]*?\}/,
      ];
      let jsonStr = null;
      for (const pattern of jsonPatterns) {
        const match = content.match(pattern);
        if (match) {
          jsonStr = match[0];
          break;
        }
      }
      if (jsonStr) {
        try {
          jsonStr = jsonStr
            .replace(/[\x00-\x1F\x7F]/g, "")
            .replace(/\\n/g, "\\n")
            .replace(/\\"/g, '\\"')
            .trim();
          generated = JSON.parse(jsonStr);
        } catch (parseError) {
          // Strategy 4: Attempt basic fixes
          const fixedJson = jsonStr
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]")
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
            .replace(/:\s*'([^']*)'/g, ': "$1"')
            .replace(/\\'/g, "'");
          generated = JSON.parse(fixedJson);
        }
      }
    }
  }

  // Strategy 5: markdown code block fallback
  if (!generated) {
    const codeMatch = content.match(/```(?:python|javascript|js|bash|sh|java|go|rust|php|ruby|py)?\n?([\s\S]*?)```/);
    if (codeMatch) {
      const code = codeMatch[1].trim();
      let name = "script.py";
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
      const promptLower = prompt.toLowerCase();
      if (promptLower.includes("crud")) name = `crud${ext}`;
      else if (promptLower.includes("hello")) name = `hello${ext}`;
      else if (promptLower.includes("alphabet")) name = `alphabet${ext}`;
      else if (promptLower.includes("js") || promptLower.includes("javascript") || promptLower.includes("node")) {
        name = "script.js"; ext = ".js";
      } else name = `script${ext}`;
      generated = { name, code, explanation: `Generated from markdown: ${prompt}` };
    }
  }

  if (!generated || typeof generated !== "object") {
    throw new Error("Failed to generate valid response object");
  }
  if (!generated.name) generated.name = "script.py";
  if (!generated.code) generated.code = `print("Generated for: ${prompt}")`;
  if (!generated.explanation) generated.explanation = `Script for: ${prompt}`;

  return generated;
}

module.exports = { generateWithQVAC };
