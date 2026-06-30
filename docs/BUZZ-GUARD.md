# バズ対策（Buzz Guard）

Reddit 等の急増トラフィック向け。実装日: 2026-06-30

## 1. 静的 JSON の CDN キャッシュ

- `_headers` … Cloudflare Pages / Netlify 向け（`/data/*` → `max-age=600`）
- `vercel.json` … Vercel 向けヘッダー

ホストが GitHub Pages のみの場合は、手前の CDN（Cloudflare 等）で同様の Cache-Control を設定してください。

## 2. ブラウザ側ガード（`scripts/buzz-guard.js`）

| 機能 | 内容 |
|------|------|
| `weather.json` | 最大2回リトライ。400件未満なら「burst mode」 |
| Open-Meteo 直叩き | セッションあたり最大 24 回（burst 時は 12） |
| 「残りも取得」 | `weather.json` 正常時のみ。JST 1日1回・最大30件/クリック |
| JMA タイルプローブ | セッション 16 回まで。遡及・刻みを短縮 |

## 3. 自前 API プロキシ（任意）

- `api/forecast.js` … Vercel Serverless（Open-Meteo 1h メモリキャッシュ）
- `data/site-config.json` の `snowApiBase` を `"same-origin"` にすると `/api/forecast` を使用

Vercel に HTML + `api/` をデプロイした場合のみ有効。未設定時は従来どおり `weather.json` 優先。

## 4. 確認

```text
https://www.japowserch.com/data/weather.json  → 200、約460件
```

DevTools → Network で初回表示時の `api.open-meteo.com` が **0 件**に近いことを確認。
