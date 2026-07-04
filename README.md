# Japowsearch (JAPOWSEARCH)

日本のスキー場情報を扱う本体プロジェクトです（**ベータ・個人開発**）。ブランド名は **Japowsearch**。ローカルの作業フォルダは **JAPOWSEARCH**（例: `デスクトップ\Cloude\JAPOWSEARCH`）。GitHub 上のリポジトリ名は **`japowsearch`** を推奨しますが、既存の別名でも問題ありません。  
このリポジトリ内で、必要に応じて Gemini 連携（文案生成・補助）も使える構成にしています。

**正規リポジトリ:** https://github.com/momentum-create/POWDER  
**ライセンス:** [MIT](LICENSE) · **プライバシー:** [privacy.html](privacy.html)  
**Reddit 等の公開時:** [docs/REDDIT-PUBLISH.md](docs/REDDIT-PUBLISH.md)

## 免責（要約）

本アプリのスコア・ランキングは**参考指数**であり、滑走可否・安全判断・公式予報の代替ではありません。ゲレンデ公式・気象庁・現地判断を優先してください。

## データ出典

| データ | 出典 |
|--------|------|
| 予報（降雪・風・気温） | [Open-Meteo](https://open-meteo.com/) |
| 積雪観測・降雪タイル | [気象庁](https://www.jma.go.jp/) |
| 地図 | [OpenStreetMap](https://www.openstreetmap.org/copyright) · [CARTO](https://carto.com/attributions/) |
| ゲレンデ名・座標等 | リポジトリ内 `data/`（手動・スクリプト整備） |

第三者データの利用・再配布は各提供元の条件に従います。詳細は各 HTML フッターも参照。

## プロジェクト構成

- `ski-powder-hunter.html` / `ski-powder-hunter-en.html`: メイン表示ページ
- `data/`: ゲレンデ名・観測データ・キャッシュ JSON
- `scripts/`: データ取得・加工（Node）
- `docs/`: 公開向けドキュメント（一覧は [docs/README.md](docs/README.md)）

## セットアップ

### Node 側（Japowsearch 本体）

```bash
npm ci
```

依存の追加・更新時のみ `npm install <pkg>` を使い、`package-lock.json` をコミットする。

### Gemini 側（必要時のみ）

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

`.env` に `GEMINI_API_KEY=...` を設定（`.env.example` 参照）。**`.env` はコミットしない。**

## よく使うコマンド

- リゾート英語名生成: `npm run generate-resort-names-en`
- 天気キャッシュ更新（ローカル）: `node scripts/fetch-weather-hourly.js`
- 気象庁積雪・タイル時刻: `npm run fetch-jma-snow` / `npm run fetch-jma-snow-tile-times`

## Git（push はこのフォルダから）

このフォルダが **Git 管理の正本** です。リモートは `https://github.com/momentum-create/POWDER.git`（リポジトリ名は POWDER のまま）。

```powershell
cd $HOME\Desktop\Cloude\JAPOWSEARCH
git status
git add .
git commit -m "変更内容の要約"
git pull --rebase origin main
git push origin main
```

GitHub Desktop を使う場合も、**ローカルリポジトリのパスを `JAPOWSEARCH` に変更**してください。

## 運用方針

- 本番サイト: https://www.japowsearch.com/
- データ更新: GitHub Actions（[docs/OPS-WEATHER.md](docs/OPS-WEATHER.md)）
- エージェント・UX 仕様・手順書は **リポジトリ外（ローカルの `.claude/` 等）** で管理

## セキュリティ

公開前監査メモ: [docs/SECURITY-AUDIT-2026-06-30.md](docs/SECURITY-AUDIT-2026-06-30.md)
