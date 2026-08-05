#!/usr/bin/env node
/**
 * Generates static SEO landing pages for Japowsearch:
 * - regions/index.html (hub)
 * - regions/{id}.html (per region)
 * - faq.html
 * - sitemap.xml
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const site = "https://www.japowsearch.com";
const ogImage = `${site}/assets/track-final-dumps-poster.png`;
const today = "2026-08-04";

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
.lead{color:var(--dim);margin-bottom:1.5rem}
.cta{display:inline-block;margin:1.5rem 0;padding:.75rem 1.25rem;border:1px solid var(--accent);border-radius:10px;color:var(--accent);text-decoration:none;font-weight:700}
ul.resorts{list-style:none;display:grid;gap:.35rem;margin:1rem 0 2rem}
ul.resorts li{font-size:.9rem;color:var(--dim)}
ul.resorts strong{color:var(--text)}
footer{margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--border);font-size:.8rem;color:var(--dim)}
.grid{display:grid;gap:.75rem}
@media(min-width:600px){.grid{grid-template-columns:1fr 1fr}}
`;

function headJa({ title, description, canonical, jsonLd }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="ja" href="${canonical}">
<link rel="alternate" hreflang="en" href="${site}/ski-powder-hunter-en.html">
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
<style>${baseCss}</style>
</head>`;
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

  return `${headJa({ title: region.titleJa, description: region.descriptionJa, canonical, jsonLd })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  <nav class="meta"><a href="${site}/">ランキング</a> · <a href="${site}/regions/">エリア一覧</a> · <a href="${site}/faq.html">FAQ</a> · <a href="${site}/ski-powder-hunter-en.html">English</a></nav>
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
<footer>
<p><a href="${site}/privacy.html">プライバシー</a> · <a href="https://github.com/momentum-create/POWDER">GitHub</a></p>
</footer>
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

  return `${headJa({
    title: "スキー場エリア一覧｜Japowsearch パウダーランキング",
    description: "北海道・東北・新潟・長野・関東など、日本全国のスキー場をエリア別にパウダースコア・積雪予報で比較。",
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
  <nav class="meta"><a href="${site}/">ランキング</a> · <a href="${site}/faq.html">FAQ</a></nav>
</header>
<main>
<h1>スキー場エリア一覧</h1>
<p class="lead">エリアを選んでパウダーランキング・積雪予報を確認。全460スキー場以上を気象データで比較。</p>
<div class="grid">${cards}</div>
</main>
<footer><p><a href="${site}/privacy.html">プライバシー</a></p></footer>
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

  return `${headJa({
    title: "よくある質問（FAQ）｜Japowsearch",
    description: "パウダースコアの見方、データ出典、英語版、エリア別ランキングの使い方。",
    canonical,
    jsonLd,
  })}
<body>
<div class="wrap">
<header>
  <a class="logo" href="${site}/">Japowsearch</a>
  <nav class="meta"><a href="${site}/regions/">エリア一覧</a></nav>
</header>
<main>
<h1>よくある質問（FAQ）</h1>
${faq.map((item) => `<section style="margin:1.5rem 0;padding:1rem;border:1px solid var(--border);border-radius:12px"><h2 style="font-size:1rem;color:#fff">${item.q}</h2><p style="margin-top:.5rem;color:var(--dim)">${item.a}</p></section>`).join("\n")}
<a class="cta" href="${site}/">パウダーランキングを開く</a>
</main>
<footer><p><a href="${site}/privacy.html">プライバシー</a></p></footer>
</div>
</body>
</html>`;
}

function buildSitemap() {
  const urls = [
    { loc: `${site}/`, priority: "1.0", changefreq: "hourly" },
    { loc: `${site}/ski-powder-hunter-en.html`, priority: "0.9", changefreq: "daily" },
    { loc: `${site}/regions/`, priority: "0.85", changefreq: "weekly" },
    { loc: `${site}/faq.html`, priority: "0.7", changefreq: "monthly" },
    { loc: `${site}/privacy.html`, priority: "0.3", changefreq: "yearly" },
  ];
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

const regionsDir = path.join(root, "regions");
fs.mkdirSync(regionsDir, { recursive: true });
fs.writeFileSync(path.join(regionsDir, "index.html"), regionsHub(), "utf8");
for (const region of regions) {
  fs.writeFileSync(path.join(regionsDir, `${region.id}.html`), regionPage(region), "utf8");
}
fs.writeFileSync(path.join(root, "faq.html"), faqPage(), "utf8");
fs.writeFileSync(path.join(root, "sitemap.xml"), buildSitemap(), "utf8");
console.log(`Generated ${regions.length} region pages + hub + faq + sitemap.xml`);
