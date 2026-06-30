/**
 * Probe JMA snow mesh tiles server-side and publish latest timeStr per kind (3h / 6h).
 * Output: data/jma-snow-tile-times.json (consumed by ski-powder-hunter*.html)
 */
const fs = require("fs");
const path = require("path");

const PROBE_LAT = 38.5;
const PROBE_LNG = 137.5;
const PROBE_Z = 6;
const PROBE_TIMEOUT_MS = 8000;
const USER_AGENT = "JapawSearch/1.0 (github.com/momentum-create/POWDER)";

const KIND_CFG = {
  "3h": { element: "snowf03h", lookbackMin: 720, stepMin: 60 },
  "6h": { element: "snowf06h", lookbackMin: 1440, stepMin: 60 },
};

function latLngToTileXY(lat, lng, z) {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function getJstCalendarParts(d) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const out = { y: 0, M: 0, d: 0, H: 0, m: 0, s: 0 };
  for (const p of parts) {
    if (p.type === "year") out.y = parseInt(p.value, 10);
    if (p.type === "month") out.M = parseInt(p.value, 10);
    if (p.type === "day") out.d = parseInt(p.value, 10);
    if (p.type === "hour") out.H = parseInt(p.value, 10);
    if (p.type === "minute") out.m = parseInt(p.value, 10);
    if (p.type === "second") out.s = parseInt(p.value, 10);
  }
  return out;
}

function jstWallToUtcMs(jst) {
  return Date.UTC(jst.y, jst.M - 1, jst.d, jst.H - 9, jst.m, jst.s || 0);
}

function formatJmaTimeStr(d) {
  const jst = getJstCalendarParts(d);
  return (
    String(jst.y) +
    String(jst.M).padStart(2, "0") +
    String(jst.d).padStart(2, "0") +
    String(jst.H).padStart(2, "0") +
    String(jst.m).padStart(2, "0") +
    "00"
  );
}

function buildTileUrl(kind, timeStr, z, x, y) {
  const cfg = KIND_CFG[kind];
  if (!cfg) return null;
  return `https://www.jma.go.jp/bosai/jmatile/data/snow/${timeStr}/none/${timeStr}/surf/${cfg.element}/${z}/${x}/${y}.png`;
}

async function probeTileExists(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    return res.ok;
  } catch (_e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function findLatestTimeStr(kind) {
  const cfg = KIND_CFG[kind];
  const { x, y } = latLngToTileXY(PROBE_LAT, PROBE_LNG, PROBE_Z);
  const now = new Date();
  now.setMilliseconds(0);
  const jst = getJstCalendarParts(now);
  jst.s = 0;
  jst.m = Math.floor(jst.m / cfg.stepMin) * cfg.stepMin;
  const anchorMs = jstWallToUtcMs(jst);

  for (let offset = 0; offset <= cfg.lookbackMin; offset += cfg.stepMin) {
    const t = new Date(anchorMs - offset * 60 * 1000);
    const timeStr = formatJmaTimeStr(t);
    const url = buildTileUrl(kind, timeStr, PROBE_Z, x, y);
    if (!url) continue;
    const hit = await probeTileExists(url);
    if (hit) return timeStr;
  }
  return null;
}

async function main() {
  const times = {};
  for (const kind of Object.keys(KIND_CFG)) {
    times[kind] = await findLatestTimeStr(kind);
    console.error(`[jma-snow-tile-times] ${kind}: ${times[kind] || "(not found)"}`);
  }

  const out = {
    generated_at: new Date().toISOString(),
    probe: { lat: PROBE_LAT, lng: PROBE_LNG, z: PROBE_Z },
    times,
  };

  const outPath = path.join(__dirname, "..", "data", "jma-snow-tile-times.json");
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.error(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
