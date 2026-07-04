# Reddit 公開ガイド（Japowsearch / POWDER）

更新: 2026-06-30

## 貼る URL（1 本に統一）

| 種別 | URL |
|------|-----|
| **GitHub（正）** | https://github.com/momentum-create/POWDER |
| **公開サイト（JA）** | https://www.japowsearch.com/ski-powder-hunter.html |
| **公開サイト（EN）** | https://www.japowsearch.com/ski-powder-hunter-en.html |
| **トップ（リダイレクト等）** | https://www.japowsearch.com/ |

`Seeker-x1/POWDER` は fork 用。Reddit では **momentum-create/POWDER** と **www.japowsearch.com** を貼る。

> **用語:** 「公開 URL」= 一般ユーザーがブラウザで開く本番サイト（上表）。「デモ URL」は同じものを指していた（別環境の staging はない）。Reddit には GitHub + 公開サイトのどちらか、または両方。

## 投稿の位置づけ（推奨）

- **ベータ・個人開発**の参考 UI
- 滑走可否・安全判断ツール**ではない**
- フィードバック歓迎（バグ・データ誤り）

## 避ける表現

- 「どこに行けばパウダーが取れる」
- 「滑走 OK と出たら行っていい」
- 「気象庁より正確」

## 固定文案（コピペ用・レビューなしで変えない）

以下は **Reddit / SNS 投稿の正本**。ベータ・参考表示・非安全助言を固定する。

### 英語（r/SideProject / r/skiing 等）

```
[Beta] JapawSerch — Japan ski resort powder forecast dashboard (personal project)

Static map + ranking for ~450 Japanese resorts. Combines Open-Meteo forecasts with JMA snow data/tiles.

⚠️ Reference / entertainment only — NOT go/no-go or avalanche/safety advice. Always follow official resort and local conditions.

GitHub: https://github.com/momentum-create/POWDER
Live (JA): https://www.japowserch.com/ski-powder-hunter.html

Bug reports & wrong data: GitHub Issues welcome.
```

### 日本語（r/japanski 等）

```
日本のゲレンデ天気を一覧する個人開発ベータです（JapawSerch）。

Open-Meteo と気象庁データの参考表示です。滑走判断・安全助言はしません。現地・公式情報を優先してください。

GitHub: https://github.com/momentum-create/POWDER
公開サイト: https://www.japowserch.com/ski-powder-hunter.html

データ誤り・バグは GitHub Issues で歓迎します。
```

## 投稿文案（英語・r/SideProject 向け例）

> **[Beta] Japowsearch — Japan ski resort powder forecast dashboard (personal project)**  
> Static HTML map + ranking for ~450 JP resorts. Combines Open-Meteo forecasts with JMA snow observations/tiles. **Reference only — not safety or go/no-go advice.** Avalanche/backcountry out of scope.  
> GitHub: https://github.com/momentum-create/POWDER  
> Feedback on data bugs welcome.

## 投稿文案（日本語・r/japanski 等向け例）

> 日本のゲレンデ予報を一覧する個人開発ベータです。Open-Meteo と気象庁データの参考表示。**滑走判断・安全助言はしません。** 現地・公式情報優先で見てください。  
> https://github.com/momentum-create/POWDER

## 公開前に済ませたこと（2026-06-30）

- 誤配置 `docs/agent-handoff.md`（別プロジェクト）削除
- 本番 HTML から localhost デバッグ ingest 除去
- 免責・データ出典フッター、プライバシー `privacy.html`
- `tier: mock` ガイドリンク非表示
- パウダー判定文言の弱め（「参考」表記）
- Git 履歴の `.env` 実値チェック（問題なし）
- **Buzz Guard**（`scripts/buzz-guard.js`、`_headers`、`vercel.json`、`api/forecast.js`）— 詳細は [docs/BUZZ-GUARD.md](BUZZ-GUARD.md)
- **サーバー配信 JMA 降雪タイル時刻**（`data/jma-snow-tile-times.json`、Actions）— [docs/OPS-WEATHER.md](OPS-WEATHER.md)
- **Service Worker**（`sw.js`）— `/data/*.json` の 10 分キャッシュ（ヘッダ非対応ホスト向け）
