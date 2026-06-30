# 天気・積雪データ運用（GitHub Actions）

更新: 2026-06-30

## ワークフロー一覧

| ワークフロー | スケジュール (UTC) | 出力 | 手動実行 |
|-------------|-------------------|------|---------|
| **Update weather cache** | 毎時 `:00` / `:15` | `data/weather.json` | ✅ workflow_dispatch |
| **Update JMA snow cache** | 毎日 `14:10`（JST 23:10） | `data/jma-snow.json`, `data/jma-snow-meta.json` | ✅ |
| **Update JMA snow tile times** | 毎時 `:30` | `data/jma-snow-tile-times.json` | ✅ |

失敗時はリポジトリに **`workflow-failure`** ラベル付き Issue が自動作成されます（重複タイトルはコメント追記）。

## 手動で再実行する

1. GitHub → **Actions** → 対象ワークフロー
2. **Run workflow** → Branch: `main` → Run
3. 完了後 `data/*.json` のコミットを確認

ローカルから実行する場合（ルートで）:

```bash
node scripts/fetch-weather-hourly.js
node scripts/fetch-jma-snow.js
node scripts/fetch-jma-snow-tile-times.js
```

## 障害時の確認

1. Actions の失敗ログ（Open-Meteo / 気象庁 CSV / JMA タイルの HTTP）
2. `data/weather.json` の最終コミット時刻（古いとクライアントは制限付き API 直叩きに寄る）
3. `data/jma-snow-tile-times.json` の `generated_at`（古いとクライアントが JMA タイルを再プローブ）
4. 本番の `Cache-Control`（Vercel `vercel.json` / `_headers`）と Service Worker `sw.js`（10 分 TTL）

## Reddit トラフィック時

- 天気: 事前ビルドの `weather.json` を優先（Buzz Guard）
- 降雪タイル: サーバー配信の `timeStr` を優先（クライアントプローブ最小化）
- 詳細: [BUZZ-GUARD.md](BUZZ-GUARD.md)
