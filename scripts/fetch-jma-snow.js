/**
 * 気象庁「現在の積雪の深さ」「日最深積雪」「降雪量（3h等）」CSV を取得し、
 * 各ゲレンデに「最も近い観測所」の積雪・日最深・降雪を紐づけて data/jma-snow.json に保存する。
 * 日1回実行を想定（例: GitHub Actions で 8:00 JST など）。
 * 紐づけ方針: docs/気象庁積雪データの紐づけ.md を参照。
 */
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "ski-powder-hunter.html");
const stationsPath = path.join(__dirname, "..", "data", "amedas-stations.json");
const outPath = path.join(__dirname, "..", "data", "jma-snow.json");

const JMA_SNC_CSV_URL = "https://www.data.jma.go.jp/stats/data/mdrr/snc_rct/alltable/snc00_rct.csv";
const JMA_SNDALL_CSV_URL = "https://www.data.jma.go.jp/stats/data/mdrr/snc_rct/alltable/sndall00_rct.csv";
const JMA_MXSNC_CSV_URL = "https://www.data.jma.go.jp/stats/data/mdrr/snc_rct/alltable/mxsnc00_rct.csv";
const MAX_STATION_DISTANCE_KM = 80;

function extractResorts(html) {
  const startMarker = "const RESORTS = ";
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) throw new Error("RESORTS not found");
  let pos = startIdx + startMarker.length;
  if (html[pos] !== "[") throw new Error("Expected [");
  let depth = 1;
  const begin = pos;
  pos++;
  while (pos < html.length && depth > 0) {
    const ch = html[pos];
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") depth--;
    pos++;
  }
  return JSON.parse(html.slice(begin, pos));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * CSV 1行をパース。気象庁フォーマット: 観測所番号(0), 都道府県(1), 地点(2), ..., 現在の積雪の深さcm(9)
 * 値が "--" や空の場合は null 扱い。
 */
function parseSnowCsv(csvText) {
  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const result = {}; // station_no -> { depth_cm, name, observed_at }
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].split(",").map((c) => c.trim().replace(/^"\s*|\s*"$/g, ""));
    if (row.length < 10) continue;
    const rawNo = row[0];
    if (rawNo === "観測所番号" || rawNo === "") continue; // ヘッダー行をスキップ
    const stationNo = rawNo.replace(/\D/g, "") || rawNo;
    if (!stationNo) continue;
    const depthStr = row[9];
    let depthCm = null;
    if (depthStr !== "" && depthStr !== "--" && depthStr !== "///") {
      const n = parseInt(depthStr, 10);
      if (!Number.isNaN(n) && n >= 0) depthCm = n;
    }
    const pref = row[1] || "";
    const name = row[2] || stationNo;
    const y = row[4] || "", m = row[5] || "", d = row[6] || "", h = row[7] || "7", min = row[8] || "0";
    const observedAt = y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min.padStart(2, "0")}:00+09:00` : null;
    result[String(stationNo)] = { depth_cm: depthCm, name, pref, observed_at: observedAt };
  }
  return result;
}

/**
 * 気象庁「降雪量全要素」CSV（sndall00_rct.csv）をパース。
 * 観測所番号(0), 都道府県(1), 地点(2), 国際(3), 年(4),月(5),日(6),時(7),分(8), 極値類(9-20),
 * 3時間降雪量現在値cm(21), 品質(22), 3h当日最大(23), ...
 * 24時間降雪量現在値cm(33), 品質(34), 24h当日最大(35), ... の順。
 * 戻り値: station_no -> { snowfall_3h_cm, snowfall_3h_observed_at, snowfall_24h_cm, snowfall_24h_observed_at }
 */
function parseSndallCsv(csvText) {
  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const result = {};
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].split(",").map((c) => c.trim().replace(/^"\s*|\s*"$/g, ""));
    if (row.length < 40) continue;
    const rawNo = row[0];
    if (rawNo === "観測所番号" || rawNo === "") continue;
    const stationNo = String((rawNo.replace(/\D/g, "") || rawNo));
    if (!stationNo) continue;
    const v3 = row[21]; // 3時間降雪量 現在値(cm)
    let snowfall3hCm = null;
    if (v3 !== "" && v3 !== "--" && v3 !== "///") {
      const n = parseInt(v3, 10);
      if (!Number.isNaN(n) && n >= 0) snowfall3hCm = n;
    }
    const v24 = row[33]; // 24時間降雪量 現在値(cm)
    let snowfall24hCm = null;
    if (v24 !== "" && v24 !== "--" && v24 !== "///") {
      const n24 = parseInt(v24, 10);
      if (!Number.isNaN(n24) && n24 >= 0) snowfall24hCm = n24;
    }
    const y = row[4] || "", m = row[5] || "", d = row[6] || "", h = row[7] || "0", min = row[8] || "0";
    const observedAt = y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min.padStart(2, "0")}:00+09:00` : null;
    result[stationNo] = {
      snowfall_3h_cm: snowfall3hCm,
      snowfall_3h_observed_at: observedAt,
      snowfall_24h_cm: snowfall24hCm,
      snowfall_24h_observed_at: observedAt,
    };
  }
  return result;
}

/**
 * 気象庁「日最深積雪」CSV（mxsnc00_rct.csv）をパース。
 * 観測所番号(0), 都道府県(1), 地点(2), 国際(3), 年(4),月(5),日(6),時(7),分(8),
 * 当日の最深値cm(9), 品質(10), 最深値起時 時(11), 分(12), ...
 * 戻り値: station_no -> { depth_max_today_cm, depth_max_at_hhmm, observed_at }
 */
function parseMxsncCsv(csvText) {
  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const result = {};
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].split(",").map((c) => c.trim().replace(/^"\s*|\s*"$/g, ""));
    if (row.length < 13) continue;
    const rawNo = row[0];
    if (rawNo === "観測所番号" || rawNo === "") continue;
    const stationNo = String((rawNo.replace(/\D/g, "") || rawNo));
    if (!stationNo) continue;
    const v = row[9];
    let depthMaxCm = null;
    if (v !== "" && v !== "--" && v !== "///") {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n) && n >= 0) depthMaxCm = n;
    }
    const y = row[4] || "", m = row[5] || "", d = row[6] || "";
    const hMax = row[11] ?? "", minMax = row[12] ?? "";
    const depthMaxAtHhmm = (hMax !== "" && minMax !== "") ? `${hMax.padStart(2, "0")}:${minMax.padStart(2, "0")}` : null;
    const observedAt = y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T07:00:00+09:00` : null;
    result[stationNo] = { depth_max_today_cm: depthMaxCm, depth_max_at_hhmm: depthMaxAtHhmm, observed_at: observedAt };
  }
  return result;
}

async function main() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const resorts = extractResorts(html);
  if (!fs.existsSync(stationsPath)) {
    console.error("data/amedas-stations.json がありません。docs/気象庁積雪データの紐づけ.md を参照して用意してください。");
    process.exit(1);
  }
  const stations = JSON.parse(fs.readFileSync(stationsPath, "utf8"));
  const overridesPath = path.join(__dirname, "..", "data", "jma-station-overrides.json");
  let stationOverrides = {};
  if (fs.existsSync(overridesPath)) {
    stationOverrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
  }

  let sncCsvText;
  try {
    const res = await fetch(JMA_SNC_CSV_URL, { headers: { "User-Agent": "SkiResortGuide/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    sncCsvText = await res.text();
  } catch (e) {
    console.error("気象庁積雪CSVの取得に失敗しました:", e.message);
    process.exit(1);
  }

  let sndallCsvText = null;
  try {
    const res = await fetch(JMA_SNDALL_CSV_URL, { headers: { "User-Agent": "SkiResortGuide/1.0" } });
    if (res.ok) sndallCsvText = await res.text();
  } catch (_) {
    // 降雪量CSVは季節により取得できない場合がある（冬期のみ）
  }

  let mxsncCsvText = null;
  try {
    const res = await fetch(JMA_MXSNC_CSV_URL, { headers: { "User-Agent": "SkiResortGuide/1.0" } });
    if (res.ok) mxsncCsvText = await res.text();
  } catch (_) {}

  const snowByStation = parseSnowCsv(sncCsvText);
  const sndallByStation = sndallCsvText ? parseSndallCsv(sndallCsvText) : {};
  const mxsncByStation = mxsncCsvText ? parseMxsncCsv(mxsncCsvText) : {};
  const stationNosInCsv = new Set(Object.keys(snowByStation));
  const stationsWithCoords = Object.entries(stations).filter(([no]) => stationNosInCsv.has(no));

  const out = {};
  for (const resort of resorts) {
    const rLat = resort.lat;
    const rLng = resort.lng;
    const overrideStationNo = stationOverrides[String(resort.id)];
    let best = { distKm: Infinity, stationNo: null };
    if (overrideStationNo && stations[overrideStationNo]) {
      const info = stations[overrideStationNo];
      const d = haversineKm(rLat, rLng, info.lat, info.lng);
      best = { distKm: d, stationNo: overrideStationNo };
    } else {
      for (const [no, info] of stationsWithCoords) {
        const d = haversineKm(rLat, rLng, info.lat, info.lng);
        if (d < best.distKm) {
          best = { distKm: d, stationNo: no };
        }
      }
    }
    if (best.stationNo != null && best.distKm <= MAX_STATION_DISTANCE_KM) {
      const snow = snowByStation[best.stationNo];
      const snd = sndallByStation[best.stationNo];
      const st = stations[best.stationNo];
      const entry = {
        resort_id: resort.id,
        depth_cm: snow.depth_cm,
        station_name: (st && st.name) || snow.name,
        station_no: best.stationNo,
        observed_at: snow.observed_at || null,
        dist_km: best.distKm,
      };
      if (snd && (snd.snowfall_3h_cm != null || snd.snowfall_3h_observed_at)) {
        entry.snowfall_3h_cm = snd.snowfall_3h_cm ?? null;
        entry.snowfall_3h_observed_at = snd.snowfall_3h_observed_at || null;
      }
      if (snd && (snd.snowfall_24h_cm != null || snd.snowfall_24h_observed_at)) {
        entry.snowfall_24h_cm = snd.snowfall_24h_cm ?? null;
        entry.snowfall_24h_observed_at = snd.snowfall_24h_observed_at || null;
      }
      const mx = mxsncByStation[best.stationNo];
      if (mx && (mx.depth_max_today_cm != null || mx.depth_max_at_hhmm)) {
        entry.depth_max_today_cm = mx.depth_max_today_cm ?? null;
        entry.depth_max_at_hhmm = mx.depth_max_at_hhmm || null;
        entry.depth_max_observed_at = mx.observed_at || null;
      }
      out[resort.id] = entry;
    }
  }

  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  const withDepth = Object.values(out).filter((v) => v.depth_cm != null).length;
  const with3h = Object.values(out).filter((v) => v.snowfall_3h_cm != null).length;
  const with24h = Object.values(out).filter((v) => v.snowfall_24h_cm != null).length;
  const withMax = Object.values(out).filter((v) => v.depth_max_today_cm != null).length;
  console.error(`jma-snow.json: ${Object.keys(out).length} 件紐づけ（積雪 ${withDepth} 件、日最深 ${withMax} 件、直近3h降雪 ${with3h} 件、直近24h降雪 ${with24h} 件）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
