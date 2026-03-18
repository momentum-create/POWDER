/**
 * data/nearby.json を読み、各リゾートに nearby を追加して ski-powder-hunter.html の RESORTS を更新する。
 * 実行: node scripts/merge-nearby-into-html.js
 * 前提: 先に node scripts/nearby-driving.js で data/nearby.json を生成しておく。
 */
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "ski-powder-hunter.html");
const nearbyPath = path.join(__dirname, "..", "data", "nearby.json");

const html = fs.readFileSync(htmlPath, "utf8");
const startMarker = "const RESORTS = ";
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) {
  console.error("RESORTS not found");
  process.exit(1);
}
let pos = startIdx + startMarker.length;
if (html[pos] !== "[") {
  console.error("Expected [");
  process.exit(1);
}
const begin = pos;
let depth = 1;
pos++;
while (pos < html.length && depth > 0) {
  const ch = html[pos];
  if (ch === "[" || ch === "{") depth++;
  else if (ch === "]" || ch === "}") depth--;
  pos++;
}

const resorts = JSON.parse(html.slice(begin, pos));
let nearbyData = {};
if (fs.existsSync(nearbyPath)) {
  nearbyData = JSON.parse(fs.readFileSync(nearbyPath, "utf8"));
  console.error("Loaded nearby.json for", Object.keys(nearbyData).length, "resorts");
} else {
  console.error("Warning: data/nearby.json not found. Run node scripts/nearby-driving.js first.");
}

resorts.forEach((r) => {
  const arr = nearbyData[r.id];
  r.nearby = Array.isArray(arr) ? arr.slice(0, 5) : [];
});

const newArrayStr = JSON.stringify(resorts);
const newHtml = html.slice(0, begin) + newArrayStr + html.slice(pos);
fs.writeFileSync(htmlPath, newHtml, "utf8");
console.error("Updated", htmlPath, "with nearby data.");
