#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node scripts/strip-debug-ingest.mjs <file...>");
  process.exit(1);
}

const regionRe = /\s*\/\/ #region agent log[\s\S]*?\/\/ #endregion\n?/g;
const tryRe =
  /\s*try\{\s*fetch\("http:\/\/127\.0\.0\.1:7504\/ingest\/[^"]+"[\s\S]*?\)\.catch\(function\(\)\{\}\);\s*\}catch\(_\)\{\}\n?/g;

for (const path of files) {
  let s = readFileSync(path, "utf8");
  const before = (s.match(/127\.0\.0\.1:7504/g) || []).length;
  s = s.replace(regionRe, "").replace(tryRe, "");
  writeFileSync(path, s, "utf8");
  const after = (s.match(/127\.0\.0\.1:7504/g) || []).length;
  console.log(`${path}: ${before} -> ${after}`);
}
