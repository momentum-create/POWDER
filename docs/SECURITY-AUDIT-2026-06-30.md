# セキュリティ簡易監査（Reddit 公開前）

実施日: 2026-06-30

## Git 履歴（`.env` / API キー）

| 確認 | 結果 |
|------|------|
| `git log -p --all -S "GEMINI_API_KEY="` | `.env.example` の空値 `GEMINI_API_KEY=""` のみ（055a423, b2d726c） |
| `git log -p --all -G "AIzaSy|sk-|ghp_"` | 該当コミットなし |
| 追跡されている `.env` | なし（`.gitignore` 済み） |

**判定:** 履歴への実キー混入は**検出されず**。

## ローカル未コミット

- `docs/agent-handoff.md`（Prime Car Wash 別プロジェクト文書）→ **削除済み**
- `.gitignore` にパターン追加推奨済み

## 本番 HTML

- `127.0.0.1:7504/ingest/...` デバッグブロック → **除去済み**（`ski-powder-hunter*.html`）
- `data/ski-powder-hunter*.html` は旧コピーに ingest 残存（本番パス外。必要なら別途掃除）

## 再確認コマンド

```powershell
git log -p --all -S "GEMINI_API_KEY=" -- ".env" ".env.example"
rg "AIzaSy|sk-[a-zA-Z0-9]{20,}|ghp_" --glob "!node_modules"
```
