/**
 * 全ゲレンデの天気を Open-Meteo から取得し、data/weather.json に保存する。
 * GitHub Actions から 1 時間ごとに実行する想定。
 *
 * Performance notes:
 * - fetch ごとに AbortController で per-request タイムアウトを設定し、応答が遅い API でハングしないようにする。
 * - 軽い並列度 (CONCURRENCY) で実行することで 460 件規模を実時間 10 分以内に収める。
 */
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "index.html");
const outPath = path.join(__dirname, "..", "data", "weather.json");

// 1 リクエストあたりの最大待機 (ms)。これを超えたら諦めて次に進む。
const FETCH_TIMEOUT_MS = 8000;
// 同時並列度。Open-Meteo 無料枠の許容内 (実測 ~600 req/min) で安全圏。
const CONCURRENCY = 8;

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

function processApiResponse(data) {
  const daily = data.daily || null;
  if (!daily) return null;
  if (data.hourly?.wind_speed_850hPa) {
    const h = data.hourly.wind_speed_850hPa;
    const hDir = data.hourly.wind_direction_850hPa || [];
    daily.wind_speed_850hPa_max = [];
    daily.wind_dir_850hPa = [];
    for (let d = 0; d < 7; d++) {
      const slice = h.slice(d * 24, (d + 1) * 24).filter((v) => v != null);
      daily.wind_speed_850hPa_max.push(slice.length ? Math.max(...slice) : null);
      const dSlice = hDir.slice(d * 24, (d + 1) * 24).filter((v) => v != null);
      daily.wind_dir_850hPa.push(dSlice.length ? dSlice[Math.floor(dSlice.length / 2)] : null);
    }
  }
  if (data.hourly?.snowfall) daily.hourly_snowfall = data.hourly.snowfall;
  if (data.hourly?.snow_depth) daily.hourly_snow_depth = data.hourly.snow_depth;
  return daily;
}

function buildUrl(r) {
  const elev = r.elevation?.top != null ? `&elevation=${r.elevation.top}` : "";
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lng}` +
    elev +
    `&daily=snowfall_sum,wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max,temperature_2m_min,temperature_2m_max,precipitation_hours` +
    `&hourly=wind_speed_850hPa,wind_direction_850hPa,snowfall,snow_depth` +
    `&forecast_days=7&timezone=Asia%2FTokyo`
  );
}

async function fetchOne(r) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(buildUrl(r), { signal: ac.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return processApiResponse(data);
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(resorts) {
  const cache = {};
  let nextIdx = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const i = nextIdx++;
      if (i >= resorts.length) return;
      const r = resorts[i];
      cache[r.id] = await fetchOne(r);
      completed++;
      if (completed % 50 === 0 || completed === resorts.length) {
        console.error(`Progress: ${completed}/${resorts.length}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, resorts.length) }, () => worker());
  await Promise.all(workers);
  return cache;
}

async function main() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const resorts = extractResorts(html);
  if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const startedAt = Date.now();
  const cache = await runPool(resorts);
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);

  fs.writeFileSync(outPath, JSON.stringify(cache), "utf8");
  const ok = Object.keys(cache).filter((k) => cache[k]).length;
  console.error("Wrote", outPath, ok, "/", resorts.length, "resorts in", elapsedSec, "s");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
