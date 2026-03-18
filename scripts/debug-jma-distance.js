// scripts/debug-jma-distance.js
// dist_km が大きすぎる JMA 紐づけを一覧表示する

const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "ski-powder-hunter.html");
const jmaPath = path.join(__dirname, "..", "data", "jma-snow.json");

const THRESHOLD_KM = 200;

function extractResorts(html) {
  const startMarker = "const RESORTS = ";
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) throw new Error("RESORTS not found");
  let pos = startIdx + startMarker.length;
  if (html[pos] !== "[") throw new Error("Expected [ after RESORTS =");
  let depth = 1;
  const begin = pos;
  pos++;
  while (pos < html.length && depth > 0) {
    const ch = html[pos];
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") depth--;
    pos++;
  }
  const jsonText = html.slice(begin, pos);
  return JSON.parse(jsonText);
}

function main() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const resorts = extractResorts(html);
  const jma = JSON.parse(fs.readFileSync(jmaPath, "utf8"));

  const resortById = new Map(resorts.map((r) => [String(r.id), r]));

  const bad = [];
  for (const [resortId, entry] of Object.entries(jma)) {
    const d = entry.dist_km;
    if (typeof d !== "number" || !Number.isFinite(d)) continue;
    if (d >= THRESHOLD_KM) {
      const r = resortById.get(resortId);
      bad.push({ resortId, resort: r, entry });
    }
  }

  if (!bad.length) {
    console.log(`dist_km >= ${THRESHOLD_KM} km の紐づけはありません。`);
    return;
  }

  console.log(`dist_km >= ${THRESHOLD_KM} km の紐づけ: ${bad.length} 件\n`);
  bad
    .sort((a, b) => b.entry.dist_km - a.entry.dist_km)
    .forEach((item) => {
      const { resortId, resort, entry } = item;
      const name = resort ? resort.name : "?";
      const lat = resort ? resort.lat : "?";
      const lng = resort ? resort.lng : "?";
      const stName = entry.station_name || "";
      const d = entry.dist_km.toFixed(1);
      console.log(
        `resort_id=${resortId}  name=${name}  lat=${lat}  lng=${lng}  station=${stName}  dist_km=${d}`
      );
    });
}

main();

