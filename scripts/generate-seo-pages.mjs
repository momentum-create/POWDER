#!/usr/bin/env node
/**
 * Generates static SEO landing pages for Japowsearch:
 * - regions/index.html, regions/{id}.html, faq.html
 * - about.html, affiliate-disclosure.html
 * - hubs/{asahikawa,hakuba,yuzawa}.html
 * - guides/index.html
 * - sitemap.xml
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const site = "https://japowsearch.com";
const guidesHost = "https://guides.japowserch.com";
const ogImage = `${site}/assets/track-final-dumps-poster.png`;
const today = new Date().toISOString().slice(0, 10);

const analyticsScripts = `<script src="/assets/ga-config.js"></script>
<script src="/assets/analytics.js"></script>`;

const regions = JSON.parse(
  fs.readFileSync(path.join(root, "data", "seo-regions.json"), "utf8"),
);

const tsv = fs.readFileSync(path.join(root, "RESORTS一覧.txt"), "utf8").trim();
const resortsByRegion = {};
for (const line of tsv.split(/\r?\n/).slice(1)) {
  if (!line.trim() || line.startsWith("合計")) continue;
  const [id, name, pref, region] = line.split("\t");
  if (!region) continue;
  if (!resortsByRegion[region]) resortsByRegion[region] = [];
  resortsByRegion[region].push({ id, name, pref });
}

const HUB_META = {
  asahikawa: {
    title: "Asahikawa hub hotels — powder ski base",
    description:
      "Hotel shortlist for Asahikawa powder hubs: OMO7, Kamui access, Furano raids. Compare rates on one page via Hotellook.",
    name: "Asahikawa",
    summary:
      "Base in Asahikawa for Kamui, Furano, Biei, and Asahidake raids. OMO7 runs ski shuttles — book official when rates match. Enter dates once and quote the whole shortlist.",
    powderLink: `${site}/?region=hokkaido`,
  },
  hakuba: {
    title: "Hakuba hub hotels — Happo & Goryu base",
    description:
      "Hotel shortlist for Hakuba Valley: walk-to-lift inns, ryokan with dinner. Bulk hotel quotes for inbound powder skiers.",
    name: "Hakuba",
    summary:
      "Stay in Happo village for walk-to-lift days. Maruishi and Shiroumaso are ryokan with dinner — confirm meals on official or Trip.com. Use the compare tool for dated OTA quotes.",
    powderLink: `${site}/?region=nagano`,
  },
  yuzawa: {
    title: "Echigo-Yuzawa hub hotels — station-first powder week",
    description:
      "Hotel shortlist for Yuzawa: west-exit walk hotels, NASPA shuttles, Path B parking. One-page Hotellook quotes for your powder week.",
    name: "Yuzawa",
    summary:
      "Book the bed at Echigo-Yuzawa station first. West-exit walk hotels for Path A; NASPA and Sierra use hotel shuttles. Raid Myoko or Kagura when Japowsearch lights them up.",
    powderLink: `${site}/?region=niigata`,
  },
};

const baseCss = `
:root{--navy:#0b1628;--accent:#4dd9c4;--text:#e8edf3;--dim:#8aa0b8;--border:rgba(125,170,210,.18)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Noto Sans JP",system-ui,sans-serif;background:var(--navy);color:var(--text);line-height:1.7;padding:0 1rem 3rem}
a{color:var(--accent)}
header{border-bottom:1px solid var(--border);padding:1rem 0;margin-bottom:2rem}
.wrap{max-width:48rem;margin:0 auto}
.logo{font-family:Georgia,serif;font-size:1.25rem;color:#fff;text-decoration:none}
nav.meta{font-size:.75rem;color:var(--dim);margin-top:.5rem}
h1{font-size:1.75rem;margin:1rem 0 .75rem;line-height:1.3}
h2{font-size:1.1rem;margin:1.25rem 0 .5rem;color:#fff}
.lead{color:var(--dim);margin-bottom:1.5rem}
.cta{display:inline-block;margin:1rem .5rem 1rem 0;padding:.75rem 1.25rem;border:1px solid var(--accent);border-radius:10px;color:var(--accent);text-decoration:none;font-weight:700}
.cta-secondary{border-color:var(--border);color:var(--text)}
ul.resorts,ul.hotels,ul.guides{list-style:none;display:grid;gap:.35rem;margin:1rem 0 2rem}
ul.resorts li,ul.hotels li,ul.guides li{font-size:.9rem;color:var(--dim)}
ul.resorts strong,ul.hotels strong,ul.guides strong{color:var(--text)}
footer{margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--border);font-size:.8rem;color:var(--dim)}
.grid{display:grid;gap:.75rem}
.hub-cards{display:grid;gap:.75rem;margin:1.5rem 0}
@media(min-width:600px){.grid{grid-template-columns:1fr 1fr}.hub-cards{grid-template-columns:1fr 1fr 1fr}}
`;

function siteNav(extra = "") {
  return `<nav class="meta"><a href="${site}/">Ranking</a> · <a href="${site}/tools/hotel-compare">Hotels</a> · <a href="${site}/hubs/asahikawa.html">Hubs</a> · <a href="${site}/guides/">Guides</a> · <a href="${site}/regions/">Regions</a> · <a href="${site}/faq.html">FAQ</a> · <a href="${site}/about.html">About</a>${extra}</nav>`;
}

function siteFooter() {
  return `<footer>
<p><a href="${site}/about.html">About</a> · <a href="${site}/affiliate-disclosure.html">Affiliate disclosure</a> · <a href="${site}/privacy.html">Privacy</a> · <a href="https://github.com/momentum-create/POWDER">GitHub</a></p>
</footer>`;
}

function headPage({ lang, title, description, canonical, jsonLd }) {
  const hreflangJa = lang === "ja" ? canonical : `${site}/`;
  const hreflangEn =
    lang === "en" ? canonical : `${site}/ski-powder-hunter-en.html`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="ja" href="${hreflangJa}">
<link rel="alternate" hreflang="en" href="${hreflangEn}">
<link rel="alternate" hreflang="x-default" href="${site}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Japowsearch">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" href="${site}/assets/track-final-dumps-poster.png">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${analyticsScripts}
<style>${baseCss}</style>
</head>`;
}

function loadHubShortlist(hub) {
  const p = path.join(root, "tools", "hotel-compare", "shortlists", `${hub}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function regionPage(region) {
  const resorts = (resortsByRegion[region.id] || []).slice(0, 30);
  const canonical = `${site}/regions/${region.id}.html`;
  const appUrl = `${site}/?region=${region.id}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: region.titleJa,
    description: region.descriptionJa,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "Japowsearch", url: site },
    mainEntity: {
      "@type": "ItemList",
      name: `${region.nameJa}のスキー場`,
      numberOfItems: resorts.length,
      itemListElement: resorts.slice(0, 10).map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: r.name,
      })),
    },
  };
  const resortList = resorts
    .map((r) => `<li><strong>${r.name}</strong>（${r.pref}）</li>`)
    .join("\n");

  return `${headPage({ lang: "ja", title: region.titleJa, description: region.descriptionJa, canonical, jsonLd })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav(` · <a href="${site}/ski-powder-hunter-en.html">English</a>`)}
</header>
<main>
<h1>${region.nameJa}のスキー場 パウダーランキング</h1>
<p class="lead">${region.descriptionJa}</p>
<a class="cta" href="${appUrl}">${region.nameJa}のランキングを開く →</a>
<h2>掲載スキー場（${(resortsByRegion[region.id] || []).length}件中 上位30件）</h2>
<ul class="resorts">${resortList}</ul>
<p>日付を選ぶとパウダースコア・降雪量・風・気温で並び替え可能。気象庁・Open-Meteoデータを使用。</p>
<a class="cta" href="${appUrl}">マップで全ゲレンデを見る</a>
</main>
${siteFooter()}
</div>
</body>
</html>`;
}

function regionsHub() {
  const canonical = `${site}/regions/`;
  const cards = regions
    .map((r) => {
      const count = (resortsByRegion[r.id] || []).length;
      return `<a href="${site}/regions/${r.id}.html" style="display:block;padding:1rem;border:1px solid var(--border);border-radius:12px;text-decoration:none;color:inherit"><strong style="color:#fff">${r.nameJa}</strong><br><span style="font-size:.85rem;color:var(--dim)">${count}スキー場 · ${r.descriptionJa.slice(0, 48)}…</span></a>`;
    })
    .join("\n");

  return `${headPage({
    lang: "ja",
    title: "スキー場エリア一覧｜Japowsearch パウダーランキング",
    description:
      "北海道・東北・新潟・長野・関東など、日本全国のスキー場をエリア別にパウダースコア・積雪予報で比較。",
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "スキー場エリア一覧",
      url: canonical,
    },
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav()}
</header>
<main>
<h1>スキー場エリア一覧</h1>
<p class="lead">エリアを選んでパウダーランキング・積雪予報を確認。全460スキー場以上を気象データで比較。</p>
<div class="grid">${cards}</div>
</main>
${siteFooter()}
</div>
</body>
</html>`;
}

function faqPage() {
  const canonical = `${site}/faq.html`;
  const faq = [
    {
      q: "パウダースコアとは？",
      a: "降雪量・積雪・風速・気温などを組み合わせた独自スコアです。数値が高いほどパウダー条件に近い見込みを示します（参考情報）。",
    },
    {
      q: "データの出典は？",
      a: "Open-Meteoの予報と気象庁の積雪・観測データを使用しています。公式の安全情報・リフト運行は各スキー場の発表をご確認ください。",
    },
    {
      q: "英語版はありますか？",
      a: `はい。<a href="${site}/ski-powder-hunter-en.html">English powder ranking</a>をご利用ください。`,
    },
    {
      q: "エリア別に見るには？",
      a: `<a href="${site}/regions/">エリア一覧</a>から北海道・長野などを選ぶか、ランキング画面のエリアフィルタをご利用ください。`,
    },
    {
      q: "宿を比較するツールは？",
      a: `<a href="${site}/tools/hotel-compare">Hotel compare</a>で旭川・白馬・湯沢ハブのショートリストを一括見積もりできます。`,
    },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a.replace(/<[^>]+>/g, "") },
    })),
  };

  return `${headPage({
    lang: "ja",
    title: "よくある質問（FAQ）｜Japowsearch",
    description: "パウダースコアの見方、データ出典、英語版、エリア別ランキングの使い方。",
    canonical,
    jsonLd,
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav()}
</header>
<main>
<h1>よくある質問（FAQ）</h1>
${faq
  .map(
    (item) =>
      `<section style="margin:1.5rem 0;padding:1rem;border:1px solid var(--border);border-radius:12px"><h2 style="font-size:1rem;color:#fff">${item.q}</h2><p style="margin-top:.5rem;color:var(--dim)">${item.a}</p></section>`,
  )
  .join("\n")}
<a class="cta" href="${site}/">パウダーランキングを開く</a>
</main>
${siteFooter()}
</div>
</body>
</html>`;
}

function aboutPage() {
  const canonical = `${site}/about.html`;
  return `${headPage({
    lang: "en",
    title: "About Japowsearch — Japan powder ski decision tool",
    description:
      "Japowsearch ranks 460+ Japan ski areas by powder score, snowfall, and JMA data. Hotel compare for Asahikawa, Hakuba, and Yuzawa hubs.",
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About Japowsearch",
      url: canonical,
      description:
        "Independent powder ski planning tool for inbound and domestic skiers.",
    },
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav()}
</header>
<main>
<h1>About Japowsearch</h1>
<p class="lead">Japowsearch helps skiers pick where to go tomorrow — not where marketing says you should go today.</p>
<h2>What we publish</h2>
<ul class="resorts">
<li><strong>Powder ranking</strong> — 460+ resorts scored from Open-Meteo forecasts and JMA snow observations.</li>
<li><strong>Resort guides</strong> — ${guidesHost} hosts detailed mock LPs linked from the map “detail” button.</li>
<li><strong>Hotel compare</strong> — Shortlists for Asahikawa, Hakuba, and Yuzawa powder hubs with one-page OTA quotes.</li>
</ul>
<h2>Update cadence</h2>
<p>Forecast and ranking data refresh frequently during the season. Region landing pages and guides are updated as new resorts ship.</p>
<h2>Contact</h2>
<p>Questions and bug reports: <a href="https://github.com/momentum-create/POWDER/issues">GitHub Issues</a> on the POWDER repository.</p>
<h2>Affiliate &amp; privacy</h2>
<p>Some hotel and car links are affiliate-tracked. See our <a href="${site}/affiliate-disclosure.html">affiliate disclosure</a> and <a href="${site}/privacy.html">privacy policy</a>.</p>
<a class="cta" href="${site}/ski-powder-hunter-en.html">Open powder ranking</a>
<a class="cta cta-secondary" href="${site}/tools/hotel-compare">Hotel compare tool</a>
</main>
${siteFooter()}
</div>
</body>
</html>`;
}

function affiliateDisclosurePage() {
  const canonical = `${site}/affiliate-disclosure.html`;
  return `${headPage({
    lang: "en",
    title: "Affiliate disclosure — Japowsearch",
    description:
      "How Japowsearch uses affiliate links for hotels (Travelpayouts / Hotellook) and rental cars (Discover Cars).",
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Affiliate disclosure",
      url: canonical,
    },
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav()}
</header>
<main>
<h1>Affiliate disclosure</h1>
<p class="lead">Transparency for travelers and affiliate program reviewers.</p>
<h2>Hotel compare tool</h2>
<p>The <a href="${site}/tools/hotel-compare">hotel compare</a> tool uses <strong>Travelpayouts</strong> (Partner ID / marker <code>763558</code>) for bulk “Quote all hotels” searches via <strong>Hotellook</strong>. Agoda and Booking.com-only buttons use direct affiliate IDs when configured.</p>
<p><strong>Official hotel website links are never affiliate-wrapped.</strong> When the official rate is close — especially for properties with ski shuttles or ryokan dinner plans — book direct.</p>
<h2>Rental cars</h2>
<p>Some resort guides link to <strong>Discover Cars</strong> via Post Affiliate Pro (<code>Jaapowsearch</code>). This is separate from Travelpayouts hotel programs.</p>
<h2>Your cost</h2>
<p>Affiliate commissions do not increase the price you pay. They help fund server and data costs for Japowsearch.</p>
<h2>Analytics</h2>
<p>We use Google Analytics 4 to measure traffic and improve the product. See the <a href="${site}/privacy.html">privacy policy</a>.</p>
</main>
${siteFooter()}
</div>
</body>
</html>`;
}

function hubPage(hub) {
  const meta = HUB_META[hub];
  const shortlist = loadHubShortlist(hub);
  const canonical = `${site}/hubs/${hub}.html`;
  const compareUrl = `${site}/tools/hotel-compare?hub=${hub}`;
  const hotelItems = shortlist.hotels.map((h, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: h.name,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TravelGuide",
        name: `${meta.name} powder hub hotels`,
        description: meta.summary,
        url: canonical,
      },
      {
        "@type": "ItemList",
        name: `${meta.name} hotel shortlist`,
        itemListElement: hotelItems,
      },
    ],
  };
  const hotelList = shortlist.hotels
    .map((h) => `<li><strong>${h.name}</strong> — ${h.meta}</li>`)
    .join("\n");
  const hubCards = Object.keys(HUB_META)
    .map(
      (id) =>
        `<a href="${site}/hubs/${id}.html" style="display:block;padding:.75rem;border:1px solid var(--border);border-radius:10px;text-decoration:none;color:inherit"><strong style="color:#fff">${HUB_META[id].name}</strong></a>`,
    )
    .join("\n");

  return `${headPage({
    lang: "en",
    title: meta.title,
    description: meta.description,
    canonical,
    jsonLd,
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav()}
</header>
<main>
<h1>${meta.name} hub — where to stay</h1>
<p class="lead">${meta.summary}</p>
<a class="cta" href="${compareUrl}">Compare hotels · enter dates once →</a>
<a class="cta cta-secondary" href="${meta.powderLink}">Powder ranking for ${meta.name} →</a>
<h2>Guide shortlist</h2>
<ul class="hotels">${hotelList}</ul>
<p>${shortlist.lede}</p>
<h2>Other powder hubs</h2>
<div class="hub-cards">${hubCards}</div>
</main>
${siteFooter()}
</div>
</body>
</html>`;
}

function hubsIndexPage() {
  const canonical = `${site}/hubs/`;
  const cards = Object.entries(HUB_META)
    .map(
      ([id, meta]) =>
        `<a href="${site}/hubs/${id}.html" style="display:block;padding:1rem;border:1px solid var(--border);border-radius:12px;text-decoration:none;color:inherit"><strong style="color:#fff">${meta.name}</strong><br><span style="font-size:.85rem;color:var(--dim)">${meta.description.slice(0, 72)}…</span></a>`,
    )
    .join("\n");
  return `${headPage({
    lang: "en",
    title: "Powder hub hotels — Asahikawa, Hakuba, Yuzawa",
    description: "Hotel planning for Japan powder ski hubs. Shortlists and one-page OTA quotes.",
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Powder hub hotels",
      url: canonical,
    },
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav()}
</header>
<main>
<h1>Powder hub hotels</h1>
<p class="lead">Three hubs for inbound powder weeks — compare the guide shortlist on one dated search page.</p>
<div class="grid">${cards}</div>
<a class="cta" href="${site}/tools/hotel-compare">Open hotel compare tool</a>
</main>
${siteFooter()}
</div>
</body>
</html>`;
}

async function fetchRegistryResorts() {
  try {
    const res = await fetch(`${guidesHost}/registry.json`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return data.resorts || [];
  } catch (err) {
    console.warn("guides registry fetch failed:", err.message);
    return [];
  }
}

function guidesIndexPage(resorts) {
  const canonical = `${site}/guides/`;
  const byRegion = {};
  for (const r of resorts) {
    const key = r.region?.en || r.region?.ja || "Other";
    if (!byRegion[key]) byRegion[key] = [];
    byRegion[key].push(r);
  }
  const sections = Object.keys(byRegion)
    .sort()
    .map((region) => {
      const items = byRegion[region]
        .sort((a, b) => (a.name?.en || "").localeCompare(b.name?.en || ""))
        .map(
          (r) =>
            `<li><a href="${guidesHost}/${r.id}/"><strong>${r.name?.en || r.id}</strong></a> · <a href="${guidesHost}/${r.id}/?lang=en">EN</a></li>`,
        )
        .join("\n");
      return `<h2>${region}</h2><ul class="guides">${items}</ul>`;
    })
    .join("\n");

  return `${headPage({
    lang: "en",
    title: "Resort guides — Japowsearch",
    description: `${resorts.length} Japan ski resort guides with access, onsen, and powder context. Linked from the Japowsearch map.`,
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Resort guides",
      url: canonical,
      numberOfItems: resorts.length,
    },
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav()}
</header>
<main>
<h1>Resort guides</h1>
<p class="lead">${resorts.length} ski area guides on ${guidesHost.replace("https://", "")} — open from the map “detail” button or browse by region below.</p>
<a class="cta" href="${site}/">Back to powder ranking</a>
${sections || "<p>Guide list loads from guides.japowserch.com — check back shortly.</p>"}
</main>
${siteFooter()}
</div>
</body>
</html>`;
}

function buildSitemap() {
  const urls = [
    { loc: `${site}/`, priority: "1.0", changefreq: "hourly" },
    { loc: `${site}/ski-powder-hunter-en.html`, priority: "0.9", changefreq: "daily" },
    { loc: `${site}/about.html`, priority: "0.75", changefreq: "monthly" },
    { loc: `${site}/affiliate-disclosure.html`, priority: "0.5", changefreq: "yearly" },
    { loc: `${site}/tools/hotel-compare`, priority: "0.85", changefreq: "weekly" },
    { loc: `${site}/hubs/`, priority: "0.85", changefreq: "weekly" },
    { loc: `${site}/guides/`, priority: "0.8", changefreq: "weekly" },
    { loc: `${site}/regions/`, priority: "0.85", changefreq: "weekly" },
    { loc: `${site}/faq.html`, priority: "0.7", changefreq: "monthly" },
    { loc: `${site}/privacy.html`, priority: "0.3", changefreq: "yearly" },
  ];
  for (const hub of Object.keys(HUB_META)) {
    urls.push({
      loc: `${site}/hubs/${hub}.html`,
      priority: "0.82",
      changefreq: "weekly",
    });
    urls.push({
      loc: `${site}/tools/hotel-compare?hub=${hub}`,
      priority: "0.8",
      changefreq: "weekly",
    });
  }
  for (const r of regions) {
    urls.push({
      loc: `${site}/regions/${r.id}.html`,
      priority: "0.8",
      changefreq: "daily",
    });
  }
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function writePrivacyPage() {
  const canonical = `${site}/privacy.html`;
  const html = `${headPage({
    lang: "ja",
    title: "プライバシー — Japowsearch",
    description: "Japowsearch のプライバシーポリシー。GA4、アフィリエイト、外部サービス。",
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Privacy policy",
      url: canonical,
    },
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  ${siteNav()}
</header>
<main>
<h1>プライバシーポリシー</h1>
<p class="lead"><strong>最終更新:</strong> ${today}</p>
<p>Japowsearch（POWDER）は個人開発の参考情報サイトです。</p>
<h2>収集する情報</h2>
<ul class="resorts">
<li>本サイトはログイン機能を提供しません。</li>
<li><strong>Google Analytics 4</strong> を使用し、ページ閲覧・参照元・端末種別などの匿名統計を収集します（IP匿名化を有効化）。</li>
<li>ブラウザの <code>localStorage</code> に、気象庁降雪タイルの最終表示時刻など、表示のための設定のみを保存することがあります（端末内のみ）。</li>
</ul>
<h2>アフィリエイトリンク</h2>
<p>ホテル比較ツール等の一部リンクは Travelpayouts / Hotellook、レンタカーは Discover Cars 等のアフィリエイト経由です。第三者の Cookie が設定される場合があります。詳細は <a href="${site}/affiliate-disclosure.html">Affiliate disclosure</a> を参照してください。</p>
<h2>外部サービス</h2>
<p>天気・地図表示のため、利用者のブラウザから次の第三者へリクエストが送信されます。</p>
<ul class="resorts">
<li><a href="https://open-meteo.com/" rel="noopener">Open-Meteo</a>（予報）</li>
<li><a href="https://www.jma.go.jp/" rel="noopener">気象庁</a>（積雪・タイル）</li>
<li><a href="https://www.openstreetmap.org/" rel="noopener">OpenStreetMap</a> / <a href="https://carto.com/" rel="noopener">CARTO</a>（地図）</li>
<li><a href="https://analytics.google.com/" rel="noopener">Google Analytics</a>（アクセス解析）</li>
</ul>
<p>オプトアウト: <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Google Analytics Opt-out Browser Add-on</a></p>
<h2>お問い合わせ</h2>
<p>GitHub リポジトリの Issue: <a href="https://github.com/momentum-create/POWDER/issues">momentum-create/POWDER</a></p>
<div style="margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border)" lang="en">
<h2>Privacy (summary, English)</h2>
<p>No accounts. GA4 for anonymous usage statistics. Affiliate links on hotel compare and some guides. Optional <code>localStorage</code> for UI state. Your browser calls Open-Meteo, JMA, OSM, CARTO, and Google Analytics directly.</p>
</div>
</main>
${siteFooter()}
</div>
</body>
</html>`;
  fs.writeFileSync(path.join(root, "privacy.html"), html, "utf8");
}

async function main() {
  const registryResorts = await fetchRegistryResorts();

  const regionsDir = path.join(root, "regions");
  fs.mkdirSync(regionsDir, { recursive: true });
  fs.writeFileSync(path.join(regionsDir, "index.html"), regionsHub(), "utf8");
  for (const region of regions) {
    fs.writeFileSync(path.join(regionsDir, `${region.id}.html`), regionPage(region), "utf8");
  }

  const hubsDir = path.join(root, "hubs");
  fs.mkdirSync(hubsDir, { recursive: true });
  fs.writeFileSync(path.join(hubsDir, "index.html"), hubsIndexPage(), "utf8");
  for (const hub of Object.keys(HUB_META)) {
    fs.writeFileSync(path.join(hubsDir, `${hub}.html`), hubPage(hub), "utf8");
  }

  const guidesDir = path.join(root, "guides");
  fs.mkdirSync(guidesDir, { recursive: true });
  fs.writeFileSync(path.join(guidesDir, "index.html"), guidesIndexPage(registryResorts), "utf8");

  fs.writeFileSync(path.join(root, "faq.html"), faqPage(), "utf8");
  fs.writeFileSync(path.join(root, "about.html"), aboutPage(), "utf8");
  fs.writeFileSync(path.join(root, "affiliate-disclosure.html"), affiliateDisclosurePage(), "utf8");
  writePrivacyPage();
  fs.writeFileSync(path.join(root, "sitemap.xml"), buildSitemap(), "utf8");

  console.log(
    `Generated ${regions.length} region pages, 3 hub pages, guides index (${registryResorts.length} resorts), about, disclosure, privacy, sitemap.xml`,
  );
}

main();
