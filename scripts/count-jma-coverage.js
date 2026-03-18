// scripts/count-jma-coverage.js
// RESORTS と jma-snow.json の紐づき状況を集計して表示するスクリプト

const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "ski-powder-hunter.html");
const jmaPath = path.join(__dirname, "..", "data", "jma-snow.json");

// ski-powder-hunter.html から RESORTS 配列を抜き出す
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

  const totalResorts = resorts.length;
  let withJma = 0;
  const noJmaIds = [];

  for (const r of resorts) {
    if (jma[String(r.id)] != null) {
      withJma++;
    } else {
      noJmaIds.push(r.id);
    }
  }

  console.log(`RESORTS 総数: ${totalResorts} 件`);
  console.log(`JMA紐づきあり: ${withJma} 件`);
  console.log(`JMAなし: ${totalResorts - withJma} 件`);

  if (noJmaIds.length) {
    console.log("JMAが紐づいていないリゾートID一覧:");
    console.log(noJmaIds.join(","));
  }
}

main();

