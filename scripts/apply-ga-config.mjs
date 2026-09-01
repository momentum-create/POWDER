#!/usr/bin/env node
/**
 * Inject GA4_MEASUREMENT_ID from .env into assets/ga-config.js
 *
 * Usage:
 *   node scripts/apply-ga-config.mjs
 *   GA4_MEASUREMENT_ID=G-XXXX node scripts/apply-ga-config.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const outPath = join(root, "assets", "ga-config.js");

function loadEnv() {
  try {
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trimStart().startsWith("#")) continue;
      const val = m[2].replace(/^["']|["']$/g, "").trim();
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnv();
const id = (process.env.GA4_MEASUREMENT_ID || "").trim();
const body = `/** Set your GA4 Measurement ID from Google Analytics → Admin → Data streams. */
window.__GA4_MEASUREMENT_ID = ${JSON.stringify(id)};
`;
writeFileSync(outPath, body, "utf8");
console.log(
  id
    ? `apply-ga-config: OK — ${id}`
    : "apply-ga-config: OK — empty ID (set GA4_MEASUREMENT_ID in .env)",
);
