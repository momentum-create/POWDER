/**
 * Vercel serverless: Open-Meteo proxy with in-memory TTL cache (1h).
 * Deploy on Vercel → set data/site-config.json snowApiBase to "same-origin"
 */
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

function cacheKey(lat, lng, elevation) {
  return [Number(lat).toFixed(4), Number(lng).toFixed(4), elevation || ""].join(",");
}

function buildUrl(lat, lng, elevation) {
  const elev = elevation ? `&elevation=${encodeURIComponent(elevation)}` : "";
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}${elev}` +
    "&daily=snowfall_sum,wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max,temperature_2m_min,temperature_2m_max,precipitation_hours" +
    "&hourly=wind_speed_850hPa,wind_direction_850hPa,snowfall,snow_depth,precipitation_probability,rain,precipitation,temperature_2m" +
    "&past_days=1&forecast_days=7&timezone=Asia%2FTokyo"
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return;
  }

  const lat = req.query.lat;
  const lng = req.query.lng;
  const elevation = req.query.elevation;
  if (lat == null || lng == null) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "lat and lng required" }));
    return;
  }

  const key = cacheKey(lat, lng, elevation);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    res.setHeader("X-Cache", "HIT");
    res.end(JSON.stringify(hit.data));
    return;
  }

  try {
    const upstream = await fetch(buildUrl(lat, lng, elevation));
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "upstream " + upstream.status }));
      return;
    }
    const data = await upstream.json();
    cache.set(key, { data, fetchedAt: now });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    res.setHeader("X-Cache", "MISS");
    res.end(JSON.stringify(data));
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: String(e && e.message ? e.message : e) }));
  }
};
