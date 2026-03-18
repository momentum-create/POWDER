# scripts フォルダ

## ゲレンデ名の置き換え（今後も同じ対応で使う）

**update-resorts-list.ps1** … ゲレンデ名の変更時に、次の3ファイルを一括で置換します。

- RESORTS一覧.txt
- ski-powder-hunter.html
- ski-powder-hunter-en.html

UTF-8 で読み書きするため、日本語の名前変更でも確実に置換できます。

```powershell
# リポジトリのルート（POWDER）で実行
.\scripts\update-resorts-list.ps1 -Old "旧名称" -New "新名称"
```

くわしくは [ゲレンデ追加とリンク確認.md](../ゲレンデ追加とリンク確認.md) の「ゲレンデ名の置き換え」を参照。

---

## その他のスクリプト

- fetch-jma-snow.js / fetch-weather-hourly.js … 気象データ取得
- check-elevation.js / list-resorts.js … データ確認
- check-links.js … 公式リンク確認
- merge-nearby-into-html.js / nearby-driving.js … 近隣リゾート・車距離
