const fs = require("fs");
const path = require("path");
const htmlPath = path.join(__dirname, "..", "ski-powder-hunter.html");
const html = fs.readFileSync(htmlPath, "utf8");

// RESORTS の開始位置を探す
const startMarker = "const RESORTS = ";
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) {
  console.error("RESORTS not found");
  process.exit(1);
}
let pos = startIdx + startMarker.length;
if (html[pos] !== "[") {
  console.error("Expected [ after const RESORTS = ");
  process.exit(1);
}
let depth = 1;
let begin = pos;
pos++;
while (pos < html.length && depth > 0) {
  const ch = html[pos];
  if (ch === "[" || ch === "{") depth++;
  else if (ch === "]" || ch === "}") depth--;
  pos++;
}
const json = html.slice(begin, pos);
let arr;
try {
  arr = JSON.parse(json);
} catch (e) {
  console.error("JSON parse error:", e.message);
  process.exit(1);
}
const lines = ["id\tname\tpref\tregion"];
arr.forEach((r) => {
  lines.push(`${r.id}\t${r.name}\t${r.pref}\t${r.region || ""}`);
});
lines.push("", `合計: ${arr.length} 件`);
const out = lines.join("\n");
console.log(out);
// UTF-8でファイルにも保存（Cursor/エクスプローラーで開ける）
const outPath = path.join(__dirname, "..", "RESORTS一覧.txt");
fs.writeFileSync(outPath, "\uFEFF" + out, "utf8");
console.error("→ " + outPath + " に保存しました");
