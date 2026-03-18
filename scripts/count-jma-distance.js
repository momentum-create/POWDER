// scripts/count-jma-distance.js
// jma-snow.json に含まれる観測点との距離分布を集計する

const fs = require("fs");
const path = require("path");

const jmaPath = path.join(__dirname, "..", "data", "jma-snow.json");

function main() {
  const jma = JSON.parse(fs.readFileSync(jmaPath, "utf8"));
  const entries = Object.values(jma);

  const total = entries.length;
  const withDist = entries.filter((e) => typeof e.dist_km === "number" && Number.isFinite(e.dist_km));

  if (!withDist.length) {
    console.log("dist_km が含まれていません。fetch-jma-snow.js の修正と再実行を確認してください。");
    return;
  }

  const dists = withDist.map((e) => e.dist_km).slice().sort((a, b) => a - b);

  const min = dists[0];
  const max = dists[dists.length - 1];
  const avg = dists.reduce((a, b) => a + b, 0) / dists.length;
  const p50 = dists[Math.floor(dists.length * 0.5)];
  const p90 = dists[Math.floor(dists.length * 0.9)];
  const over30 = dists.filter((d) => d > 30).length;
  const over50 = dists.filter((d) => d > 50).length;

  console.log(`JMA紐づきゲレンデ数: ${total} 件（dist_kmあり: ${withDist.length} 件）`);
  console.log(
    `距離 min/median/avg/max: ${min.toFixed(1)} / ${p50.toFixed(1)} / ${avg.toFixed(1)} / ${max.toFixed(1)} km`
  );
  console.log(`30km超: ${over30} 件, 50km超: ${over50} 件`);

  // 距離帯ごとの集計
  const bandDefs = [
    { key: "0-10", label: "0–10 km", inBand: (d) => d >= 0 && d < 10 },
    { key: "10-30", label: "10–30 km", inBand: (d) => d >= 10 && d < 30 },
    { key: "30-50", label: "30–50 km", inBand: (d) => d >= 30 && d < 50 },
    { key: "50-80", label: "50–80 km", inBand: (d) => d >= 50 && d < 80 },
    { key: "80-120", label: "80–120 km", inBand: (d) => d >= 80 && d < 120 },
    { key: "120+", label: "120km〜", inBand: (d) => d >= 120 },
  ];
  const bandCounts = Object.fromEntries(bandDefs.map((b) => [b.key, 0]));

  withDist.forEach((e) => {
    const d = e.dist_km;
    const band = bandDefs.find((b) => b.inBand(d));
    if (band) bandCounts[band.key]++;
  });

  console.log("\n=== JMA 距離バンド集計 (dist_km) ===");
  bandDefs.forEach((b) => {
    const count = bandCounts[b.key] || 0;
    console.log(`${b.label.padEnd(9, " ")}: ${count} 件`);
  });

  // 距離の大きい順にソートしたフルリスト
  const sortedByDist = withDist
    .slice()
    .sort((a, b) => {
      const da = typeof a.dist_km === "number" ? a.dist_km : -Infinity;
      const db = typeof b.dist_km === "number" ? b.dist_km : -Infinity;
      return db - da;
    });

  const LIMIT = 200;
  console.log(`\n=== dist_km 大きい順 全リスト (上位 ${LIMIT} 件) ===`);
  sortedByDist.slice(0, LIMIT).forEach((e, idx) => {
    const rid = e.resort_id != null ? e.resort_id : "?";
    const st = e.station_name || "";
    const d = typeof e.dist_km === "number" ? e.dist_km.toFixed(1) : "NA";
    console.log(`${idx + 1}. ${d} km  resort_id=${rid}  station=${st}`);
  });
}

main();

