const path = require("path");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function stripCodeFences(text) {
  const t = String(text || "");
  const m = t.match(/```[a-zA-Z0-9_\-]*\n([\s\S]*?)```/);
  return m ? m[1] : t;
}

function unescapeCommon(text) {
  return String(text || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function normalizeCode(text) {
  const unfenced = stripCodeFences(text);
  return unescapeCommon(unfenced).replace(/\r\n/g, "\n");
}

function guessExtension(code, hint) {
  const sample = `${hint || ""}\n${code || ""}`.toLowerCase();
  const checks = [
    {
      ext: ".js",
      any: ["console.log(", "require(", "module.exports", "export ", "import "],
    },
    {
      ext: ".ts",
      any: [": string", ": number", "interface ", "type ", "import "],
    },
    { ext: ".py", any: ["import ", "def ", "print(", " os.", " sys."] },
    {
      ext: ".sh",
      any: [
        "#!/bin/bash",
        "#!/usr/bin/env bash",
        " echo ",
        " rm ",
        " grep ",
        " for ",
      ],
    },
    { ext: ".rb", any: ["puts ", "def ", "end", "require "] },
    { ext: ".php", any: ["<?php", " echo ", " function "] },
    { ext: ".go", any: ["package main", "func main()", "fmt."] },
    {
      ext: ".java",
      any: ["class ", "public static void main", "system.out.println"],
    },
    { ext: ".kt", any: ["fun main(", "val ", "var ", "println("] },
    { ext: ".swift", any: ["import foundation", "print(", "let ", "var "] },
    { ext: ".ps1", any: ["write-host", "param(", "$psversiontable"] },
    { ext: ".lua", any: ["print(", "local ", "function "] },
    { ext: ".rs", any: ["fn main()", "println!", "use "] },
    {
      ext: ".cs",
      any: ["using system;", "static void main", "console.writeline"],
    },
    { ext: ".pl", any: ["#!/usr/bin/perl", "use strict;", "my $"] },
    { ext: ".sql", any: ["select ", "create table", "insert into", "with "] },
    { ext: ".yaml", any: [": ", "- "] },
    { ext: ".json", any: ["{", ":", "}"] },
  ];
  for (const c of checks) {
    if (c.any.some((tok) => sample.includes(tok))) return c.ext;
  }
  return ".txt";
}

function detectStrongExtension(code) {
  const src = String(code || "");
  const lower = src.toLowerCase();
  if (/\bpublic\s+static\s+void\s+main\s*\(/.test(src)) return ".java";
  if (/\bfun\s+main\s*\(/.test(src)) return ".kt";
  if (/using\s+System\s*;/.test(src) && /static\s+void\s+Main\s*\(/.test(src))
    return ".cs";
  if (/\bpackage\s+main\b/.test(src) && /\bfunc\s+main\s*\(\)/.test(src))
    return ".go";
  if (/\bfn\s+main\s*\(\)/.test(src)) return ".rs";
  if (/^\s*<\?php\b/.test(src)) return ".php";
  if (/\bputs\s+/.test(src) && /\bend\b/.test(lower)) return ".rb";
  if (/^#!\/bin\/(bash|sh)/m.test(src)) return ".sh";
  if (/\bdef\s+\w+\s*\(.*\)\s*:/.test(src) || /\bimport\s+\w+/.test(src))
    return ".py";
  if (/^\s*\{[\s\S]*\}\s*$/.test(src)) return ".json";
  if (
    /\b(select|insert\s+into|update|delete\s+from|create\s+table|with)\b/i.test(
      src
    )
  )
    return ".sql";
  if (
    /\binterface\s+\w+/.test(src) ||
    /:\s*(string|number|boolean|any|unknown|never)\b/.test(src)
  )
    return ".ts";
  if (
    /console\.log\s*\(/.test(src) ||
    /\brequire\s*\(/.test(src) ||
    /module\.exports\b/.test(src) ||
    /\bexport\s+(default|const|function|class)\b/.test(src) ||
    /\bimport\s+.*from\b/.test(src)
  )
    return ".js";
  return "";
}

function inferExtFromHints(name, prompt) {
  const hay = `${name || ""} ${prompt || ""}`.toLowerCase();
  const pairs = [
    { k: ["javascript", " js ", "-js", " js."], ext: ".js" },
    { k: ["typescript", " ts ", "-ts", " ts."], ext: ".ts" },
    { k: ["python", " py ", "-py", " py."], ext: ".py" },
    { k: ["bash", " shell ", " sh ", "-sh", " sh."], ext: ".sh" },
    { k: ["ruby", " rb ", "-rb", " rb."], ext: ".rb" },
    { k: ["php"], ext: ".php" },
    { k: [" golang ", " go ", "-go", " go."], ext: ".go" },
    { k: [" java ", "-java", " java."], ext: ".java" },
    { k: [" kotlin ", " kt ", "-kt", " kt."], ext: ".kt" },
    { k: [" swift "], ext: ".swift" },
    { k: [" powershell ", " ps1 ", "-ps1", " ps1."], ext: ".ps1" },
    { k: [" lua "], ext: ".lua" },
    { k: [" rust ", " rs ", "-rs", " rs."], ext: ".rs" },
    { k: [" c# ", " csharp ", " cs ", "-cs", " cs."], ext: ".cs" },
    { k: [" perl ", " pl ", "-pl", " pl."], ext: ".pl" },
    { k: [" sql "], ext: ".sql" },
    { k: [" yaml ", " yml "], ext: ".yaml" },
    { k: [" json "], ext: ".json" },
  ];
  for (const p of pairs) {
    if (p.k.some((kw) => hay.includes(kw))) return p.ext;
  }
  return "";
}

const allowedExtensions = new Set([
  ".js",
  ".ts",
  ".py",
  ".sh",
  ".rb",
  ".php",
  ".go",
  ".java",
  ".kt",
  ".swift",
  ".ps1",
  ".lua",
  ".rs",
  ".cs",
  ".pl",
  ".sql",
  ".yaml",
  ".yml",
  ".json",
  ".txt",
]);

module.exports = {
  slugify,
  stripCodeFences,
  unescapeCommon,
  normalizeCode,
  guessExtension,
  detectStrongExtension,
  inferExtFromHints,
  allowedExtensions,
};
