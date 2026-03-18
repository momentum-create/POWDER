/**
 * Generate data/resort-names-en.json from RESORTS in ski-powder-hunter-en.html
 * Converts each resort name (Japanese) to romaji using kuroshiro, then title-cases.
 *
 * Run:
 *   npm install
 *   npm run generate-resort-names-en
 *
 * Output: data/resort-names-en.json (id -> English/romaji name). The EN page
 * loads this file and uses it for displayNameEn() so all resorts show in English.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HTML_PATH = path.join(ROOT, "ski-powder-hunter-en.html");
const OUT_PATH = path.join(ROOT, "data", "resort-names-en.json");

function extractResortsArray(html) {
  const marker = "const RESORTS = ";
  const idx = html.indexOf(marker);
  if (idx === -1) throw new Error("const RESORTS = not found");
  const start = html.indexOf("[", idx);
  if (start === -1) throw new Error("RESORTS array [ not found");
  let depth = 0;
  let inString = false;
  let quote = null;
  let escape = false;
  let end = start;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === quote) inString = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      quote = c;
      continue;
    }
    if (c === "[" || c === "{") depth++;
    if (c === "]" || c === "}") {
      depth--;
      if (depth === 0 && c === "]") {
        end = j;
        break;
      }
    }
  }
  const jsonStr = html.substring(start, end + 1);
  return JSON.parse(jsonStr);
}

function titleCase(str) {
  return String(str)
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Same as in ski-powder-hunter-en.html: replace known phrases before kuroshiro
const NAME_ROMAJI = [
  ["スノーウェーブパーク", "Snow Wave Park"],
  ["ウイングヒルズ白鳥リゾート", "Wing Hills Shiratori Resort"],
  ["ホワイトピアたかす", "Whitepia Takasu"],
  ["高鷲スノーパーク", "Takasu Snow Park"],
  ["白鳥高原", "Shiratori Kogen"],
  ["白鳥リゾート", "Shiratori Resort"],
  ["スノーパーク", "Snow Park"],
  ["スキー場", "Ski Resort"],
  ["スキー", "Ski"],
  ["リゾート", "Resort"],
  ["高原", "Kogen"],
  ["パーク", "Park"],
  ["スノー", "Snow"],
  ["白鳥", "Shiratori"],
  ["高鷲", "Takasu"],
  ["町民", "Municipal"],
  ["市", "City"],
  ["国際", "International"],
  ["国定", "Quasi-National"],
  ["県営", "Prefectural"],
  ["町営", "Town"],
  ["村営", "Village"],
  ["公営", "Public"],
  ["民営", "Private"],
];

function applyNameRomaji(name) {
  let s = String(name);
  for (const [from, to] of NAME_ROMAJI) {
    s = s.split(from).join(to);
  }
  return s;
}

// After kuroshiro: replace romaji with English (leading space so words don't run together)
function postProcessRomaji(str) {
  let s = typeof str.normalize === "function" ? str.normalize("NFC") : str;
  const map = [
    [/\bsuk[iī]j[ōo]?\s*/gi, " Ski Resort "],
    [/suk[iī]j[ōo]?(?=[A-Z]|$)/gi, " Ski Resort "],
    [/\briz[ōo]uto?\s*/gi, " Resort "],
    [/riz[ōo]uto(?=[A-Z]|$)/gi, " Resort "],
    [/\bk[ōo]gen\s*/gi, " Kogen "],
    [/\bp[āa]ku\s*/gi, " Park "],
    [/p[āa]ku(?=[A-Z]|$)/gi, " Park "],
    [/\bsun[ōo]u?\s*/gi, " Snow "],
  ];
  for (const [from, to] of map) {
    s = s.replace(from, to);
  }
  // Remove any remaining CJK (e.g. unconverted 設)
  s = s.replace(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/g, "").trim();
  return s.replace(/\s+/g, " ").trim();
}

async function main() {
  console.log("Reading", HTML_PATH);
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const resorts = extractResortsArray(html);
  console.log("Found", resorts.length, "resorts");

  const Kuroshiro = require("kuroshiro").default || require("kuroshiro");
  const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji").default || require("kuroshiro-analyzer-kuromoji");
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
  console.log("Kuroshiro initialized");

  const out = {};
  for (let i = 0; i < resorts.length; i++) {
    const r = resorts[i];
    const id = r.id;
    const name = r.name || "";
    if (!name) {
      out[id] = "";
      continue;
    }
    try {
      const nameForConvert = applyNameRomaji(name);
      let romaji = await kuroshiro.convert(nameForConvert, {
        to: "romaji",
        romajiSystem: "hepburn",
        mode: "normal",
      });
      romaji = postProcessRomaji(romaji);
      romaji = romaji.replace(/([a-z])([A-Z])/g, "$1 $2"); // "imaganemachitanegawaski Resort" -> "imaganemachitanegawa ski Resort"
      romaji = titleCase(romaji);
      out[id] = romaji;
    } catch (e) {
      console.warn("Resort id", id, name, ":", e.message);
      out[id] = name;
    }
    if ((i + 1) % 100 === 0) console.log("  ", i + 1, "/", resorts.length);
  }

  const outDir = path.dirname(OUT_PATH);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", OUT_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
