# Reddit 公開ガイド（JapawSerch / POWDER）

更新: 2026-06-30

## 貼る URL（1 本に統一）

| 種別 | URL |
|------|-----|
| **GitHub（正）** | https://github.com/momentum-create/POWDER |
| **公開サイト（JA）** | https://www.japowserch.com/ski-powder-hunter.html |
| **公開サイト（EN）** | https://www.japowserch.com/ski-powder-hunter-en.html |
| **トップ（リダイレクト等）** | https://www.japowserch.com/ |

`Seeker-x1/POWDER` は fork 用。Reddit では **momentum-create/POWDER** と **www.japowserch.com** を貼る。

> **用語:** 「公開 URL」= 一般ユーザーがブラウザで開く本番サイト（上表）。「デモ URL」は同じものを指していた（別環境の staging はない）。Reddit には GitHub + 公開サイトのどちらか、または両方。

## 投稿の位置づけ（推奨）

- **ベータ・個人開発**の参考 UI
- 滑走可否・安全判断ツール**ではない**
- フィードバック歓迎（バグ・データ誤り）

## 避ける表現

- 「どこに行けばパウダーが取れる」
- 「滑走 OK と出たら行っていい」
- 「気象庁より正確」

## 投稿文案（英語・r/SideProject 向け例）

> **[Beta] JapawSerch — Japan ski resort powder forecast dashboard (personal project)**  
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
