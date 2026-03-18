/**
 * ゲレンデ公式URLのリンク確認スクリプト
 * ski-powder-hunter.html から RESORTS を読み取り、各 url に HEAD リクエストを送って確認する。
 * 使い方: node scripts/check-links.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const htmlPath = path.join(__dirname, '..', 'ski-powder-hunter.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// RESORTS 配列を抽出（括弧のバランスを取る）
const startMark = 'const RESORTS = ';
const idx = html.indexOf(startMark);
if (idx === -1) {
  console.error('RESORTS が見つかりません');
  process.exit(1);
}
let i = idx + startMark.length;
let depth = 0;
let inString = null;
let escape = false;
const start = i;
while (i < html.length) {
  const c = html[i];
  if (escape) {
    escape = false;
    i++;
    continue;
  }
  if (inString) {
    if (c === '\\') escape = true;
    else if (c === inString) inString = null;
    i++;
    continue;
  }
  if (c === '"' || c === "'") {
    inString = c;
    i++;
    continue;
  }
  if (c === '[') depth++;
  else if (c === ']') {
    depth--;
    if (depth === 0) break;
  }
  i++;
}
const jsonStr = html.slice(start, i + 1);
let resorts;
try {
  resorts = JSON.parse(jsonStr);
} catch (e) {
  console.error('RESORTS のパースに失敗しました:', e.message);
  process.exit(1);
}

function fetchHead(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      url,
      { method: 'HEAD', timeout: 8000 },
      (res) => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 })
    );
    req.on('error', (err) => resolve({ error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout' });
    });
    req.end();
  });
}

(async () => {
  const withUrl = resorts.filter((r) => r.url && r.url.trim() !== '');
  console.log(`公式URLあり: ${withUrl.length}件 / 全${resorts.length}件\n`);

  const problems = [];
  let checked = 0;
  for (const r of withUrl) {
    const result = await fetchHead(r.url);
    checked++;
    if (result.error) {
      problems.push({ id: r.id, name: r.name, url: r.url, issue: result.error });
    } else if (!result.ok) {
      problems.push({ id: r.id, name: r.name, url: r.url, issue: `HTTP ${result.status}` });
    }
    if (checked % 50 === 0) process.stdout.write(`確認中... ${checked}/${withUrl.length}\r`);
  }

  console.log(`\n確認完了: ${withUrl.length}件`);
  if (problems.length === 0) {
    console.log('問題は検出されませんでした。');
    return;
  }
  console.log(`\n要確認（${problems.length}件）:\n`);
  problems.forEach((p) => {
    console.log(`[id:${p.id}] ${p.name}`);
    console.log(`  URL: ${p.url}`);
    console.log(`  → ${p.issue}\n`);
  });
})();
