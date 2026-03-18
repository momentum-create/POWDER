/**
 * 各ゲレンデの「近隣5件（実走行距離）」を OSRM で事前計算し、nearby.json を出力する。
 * 実行: node scripts/nearby-driving.js
 * 所要時間: 約1〜2時間（OSRM を 1req/秒程度に抑えるため）。中断後は cache から再開可能。
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const htmlPath = path.join(__dirname, "..", "ski-powder-hunter.html");
const dataDir = path.join(__dirname, "..", "data");
const outPath = path.join(dataDir, "nearby.json");
const cachePath = path.join(dataDir, "nearby-osrm-cache.json");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const OSRM_DELAY_MS = 1100; // 1.1秒間隔（レート制限対策）
const CANDIDATES_BY_STRAIGHT = 12; // 直線で近い候補を何件まで OSRM にかけるか
const NEARBY_COUNT = 5;

// ---------- RESORTS 抽出（list-resorts.js と同様） ----------
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

// ---------- 直線距離（km） ----------
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------- OSRM 実走行距離（m） ----------
function fetchDrivingDistanceM(lat1, lng1, lat2, lng2) {
  return new Promise((resolve, reject) => {
    const coords = `${lng1},${lat1};${lng2},${lat2}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (data.routes && data.routes[0] && data.routes[0].distance != null) {
              resolve(data.routes[0].distance);
            } else {
              resolve(null); // NoRoute or invalid
            }
          } catch (e) {
            resolve(null);
          }
        });
      })
      .on("error", reject);
  });
}

function cacheKey(idA, idB) {
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const resorts = extractResorts(html);
  const byId = Object.fromEntries(resorts.map((r) => [r.id, r]));

  let cache = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      console.error("Loaded OSRM cache:", Object.keys(cache).length, "entries");
    } catch (e) {
      console.error("Cache load failed, starting fresh");
    }
  }

  const results = {}; // id -> [{ id, km }, ...]

  for (let i = 0; i < resorts.length; i++) {
    const from = resorts[i];
    const fromId = from.id;
    const lat1 = from.lat;
    const lng1 = from.lng;

    // 直線距離で近い順に CANDIDATES_BY_STRAIGHT 件
    const withStraight = resorts
      .filter((r) => r.id !== fromId)
      .map((r) => ({
        id: r.id,
        straightKm: haversineKm(lat1, lng1, r.lat, r.lng),
      }))
      .sort((a, b) => a.straightKm - b.straightKm)
      .slice(0, CANDIDATES_BY_STRAIGHT);

    const withDrive = [];
    for (const w of withStraight) {
      const key = cacheKey(fromId, w.id);
      let meters = cache[key];
      if (meters == null) {
        const r2 = byId[w.id];
        meters = await fetchDrivingDistanceM(lat1, lng1, r2.lat, r2.lng);
        await sleep(OSRM_DELAY_MS);
        if (meters != null) cache[key] = meters;
      }
      if (meters != null) withDrive.push({ id: w.id, km: Math.round((meters / 1000) * 10) / 10 });
    }
    withDrive.sort((a, b) => a.km - b.km);
    results[fromId] = withDrive.slice(0, NEARBY_COUNT);

    if ((i + 1) % 50 === 0) {
      fs.writeFileSync(cachePath, JSON.stringify(cache), "utf8");
      fs.writeFileSync(outPath, JSON.stringify(results), "utf8");
      console.error(`Progress: ${i + 1}/${resorts.length} (cache saved)`);
    }
  }

  fs.writeFileSync(cachePath, JSON.stringify(cache), "utf8");
  fs.writeFileSync(outPath, JSON.stringify(results), "utf8");
  console.error("Done. Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
