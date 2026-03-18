# data/

## 気象庁積雪（日1回）

- **jma-snow.json** … 各ゲレンデに「最も近い気象庁観測所」の現在積雪（snc）・日最深積雪（mxsnc）・直近3時間降雪量（snd）を紐づけたデータ。`scripts/fetch-jma-snow.js` で生成（日1回実行想定）。
- **amedas-stations.json** … 観測所番号 → 緯度・経度・地点名。紐づけに必須。サンプルのみ同梱。本番では [LANDWATCH アメダス一覧](https://landwatch.info/topic/ame-code/) 等から全観測所を用意するとよい。詳細は `docs/気象庁積雪データの紐づけ.md` を参照。

## ゲレンデ公表積雪（気象庁に紐づかないゲレンデ用）

- **resort-snow.json** … ゲレンデ公式サイト等で公表されている積雪を集計したデータ（任意）。存在しない場合はスキップされます。
- **形式**: `{ "リゾートID（文字列）": { "depth_cm": 数値, "updated_at": "YYYY-MM-DD" }, ... }`
- **使い方**: 気象庁の観測地点に紐づかないゲレンデは、このファイルに ID と積雪を書いておくと「積雪」表示と「積雪量ランキング」で使われます。優先順は **気象庁 > resort-snow.json > RESORTS の snowDepth > Open-Meteo モデル** です。
- **更新**: 手動で編集するか、各ゲレンデの公式ページからスクレイプして生成するスクリプトを用意して更新してください。`docs/気象庁積雪データの紐づけ.md` に方針を記載しています。
- **サンプル**: `resort-snow.sample.json` をコピーして `resort-snow.json` にリネームし、リゾート ID と積雪を編集して使えます。

## 近隣ゲレンデ（実走行距離）

マップでリゾートをクリックしたときに「車で近いゲレンデ」を表示するためのデータです。

### 初回セットアップ（1回だけ）

1. **実走行距離を計算**（約1〜2時間。OSRM のレート制限のため間隔を空けて取得）
   ```bash
   node scripts/nearby-driving.js
   ```
   - 出力: `data/nearby.json`（各 id ごとに近い5件の id と km）
   - 途中で止めた場合は再実行でキャッシュから続行可能

2. **HTML に埋め込む**
   ```bash
   node scripts/merge-nearby-into-html.js
   ```
   - `ski-powder-hunter.html` の RESORTS の各要素に `nearby` が追加されます

これでマップのポップアップに「車で近いゲレンデ」が表示され、クリックでそのゲレンデに飛べます。
