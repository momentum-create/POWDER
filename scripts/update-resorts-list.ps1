# ゲレンデ名の置き換えスクリプト（UTF-8 で読み書き）
# 次の3ファイルを一括更新: RESORTS一覧.txt, ski-powder-hunter.html, ski-powder-hunter-en.html
#
# 使い方:
#   .\update-resorts-list.ps1 -Old "旧ゲレンデ名" -New "新ゲレンデ名"
#
# 例:
#   .\update-resorts-list.ps1 -Old "サンアルピナ鹿島槍スキー場" -New "鹿島槍スキー場 ファミリーパーク"

param(
    [Parameter(Mandatory = $true)]
    [string]$Old,
    [Parameter(Mandatory = $true)]
    [string]$New
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

$files = @(
    @{
        Path = Join-Path $rootDir "RESORTS一覧.txt"
        Utf8Bom = $true
    },
    @{
        Path = Join-Path $rootDir "ski-powder-hunter.html"
        Utf8Bom = $false
    },
    @{
        Path = Join-Path $rootDir "ski-powder-hunter-en.html"
        Utf8Bom = $false
    }
)

$replaced = 0
foreach ($f in $files) {
    $path = $f.Path
    if (-not (Test-Path $path)) {
        Write-Warning "Skip (not found): $path"
        continue
    }
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    if (-not $content.Contains($Old)) {
        Write-Warning "Skip (old string not found): $(Split-Path -Leaf $path)"
        continue
    }
    $content = $content.Replace($Old, $New)
    $enc = New-Object System.Text.UTF8Encoding $f.Utf8Bom
    [System.IO.File]::WriteAllText($path, $content, $enc)
    $replaced++
    Write-Output "Updated: $(Split-Path -Leaf $path)"
}

if ($replaced -eq 0) {
    Write-Error "Old string not found in any file: '$Old'"
    exit 1
}
Write-Output "Done. Replaced in $replaced file(s): '$Old' -> '$New'"
