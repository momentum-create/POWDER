/**
 * 全ゲレンデの天気を Open-Meteo から取得し、data/weather.json に保存する。
 * GitHub Actions から 1 時間ごとに実行する想定。
 */
const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "ski-powder-hunter.html");
const outPath = path.join(__dirname, "..", "data", "weather.json");
const DELAY_MS = 600; // 1リクエストあたりの待ち時間（API負荷対策）

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const resorts = extractResorts(html);
  if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const cache = {};
  for (let i = 0; i < resorts.length; i++) {
    const r = resorts[i];
    const elev = r.elevation?.top != null ? `&elevation=${r.elevation.top}` : "";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lng}` +
      elev +
      `&daily=snowfall_sum,wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max,temperature_2m_min,temperature_2m_max,precipitation_hours` +
      `&hourly=wind_speed_850hPa,wind_direction_850hPa,snowfall,snow_depth` +
      `&forecast_days=7&timezone=Asia%2FTokyo`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const daily = processApiResponse(data);
      cache[r.id] = daily;
    } catch (e) {
      cache[r.id] = null;
    }
    if ((i + 1) % 50 === 0) console.error(`Progress: ${i + 1}/${resorts.length}`);
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(outPath, JSON.stringify(cache), "utf8");
  console.error("Wrote", outPath, Object.keys(cache).filter((k) => cache[k]).length, "resorts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
