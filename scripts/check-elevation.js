const fs = require("fs");
const path = require("path");
const htmlPath = path.join(__dirname, "..", "ski-powder-hunter.html");
const html = fs.readFileSync(htmlPath, "utf8");

const startMarker = "const RESORTS = ";
const startIdx = html.indexOf(startMarker);
let pos = startIdx + startMarker.length;
let depth = 1,
  begin = pos;
pos++;
while (pos < html.length && depth > 0) {
  const ch = html[pos];
  if (ch === "[" || ch === "{") depth++;
  else if (ch === "]" || ch === "}") depth--;
  pos++;
}
const arr = JSON.parse(html.slice(begin, pos));

const total = arr.length;
const noElev = arr.filter((r) => !r.elevation);
const noTop = arr.filter((r) => !r.elevation || r.elevation.top == null);
const hasTop = arr.filter((r) => r.elevation && r.elevation.top != null);

console.log("総件数:", total);
console.log("elevation オブジェクトなし:", noElev.length, "件");
console.log("elevation.top なし:", noTop.length, "件");
console.log("elevation.top あり（頂上標高m）:", hasTop.length, "件");
if (noTop.length > 0) {
  console.log("\n--- elevation.top がないゲレンデ（先頭20件）---");
  noTop.slice(0, 20).forEach((r) => console.log("  id=" + r.id, r.name, "elevation=" + JSON.stringify(r.elevation)));
}
