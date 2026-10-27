param([string]$Python = 'python')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    if (-not (Test-Path -LiteralPath $compiler)) { throw '.NET Framework 4.x C# compiler is required on Windows x64.' }
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

    # 1. Compile PeriodKeeper.exe (C# native clipboard helper)
    $helperDirectory = Join-Path $repoRoot '.generated/native/helpers'
    New-Item -ItemType Directory -Path $helperDirectory -Force | Out-Null
    $helper = Join-Path $helperDirectory 'PeriodKeeper.exe'
    $source = Join-Path $repoRoot 'app/native/PeriodKeeper.cs'
    & $compiler /nologo /utf8output /codepage:65001 /target:exe /platform:x64 /optimize+ /r:System.Web.Extensions.dll ('/out:' + $helper) $source
    if ($LASTEXITCODE -ne 0) { throw 'Punctuation helper compilation failed.' }
    $hash = (Get-FileHash -LiteralPath $helper -Algorithm SHA256).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText((Join-Path $repoRoot 'app/electron/period-helper-integrity.mjs'), "export const HELPER_SHA256 = '$hash';`n", $utf8NoBom)

    # 2. Compile JianYingEngine.exe (Refactored from 70MB Python/PyInstaller to 47KB native C#)
    $engineOutDir = Join-Path $repoRoot 'app/build/jianying'
    if (Test-Path -LiteralPath $engineOutDir) {
        Remove-Item -LiteralPath $engineOutDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $engineOutDir -Force | Out-Null
    $engineExe = Join-Path $engineOutDir 'JianYingEngine.exe'
    $engineSource = Join-Path $repoRoot 'app/native/JianYingEngine.cs'
    & $compiler /nologo /utf8output /codepage:65001 /target:exe /platform:x64 /optimize+ `
        /r:System.Web.Extensions.dll `
        /r:System.Drawing.dll `
        /r:System.Windows.Forms.dll `
        ('/out:' + $engineExe) $engineSource
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $engineExe)) {
        throw 'JianYingEngine C# compilation failed.'
    }
    $engineHash = (Get-FileHash -LiteralPath $engineExe -Algorithm SHA256).Hash.ToLowerInvariant()
    $engineManifest = "{`n  `"sha256`": `"$engineHash`"`n}`n"
    [IO.File]::WriteAllText((Join-Path $engineOutDir 'engine.json'), $engineManifest, $utf8NoBom)

    # 3. Compile WatermarkEngine.exe (Native Windows Media Foundation hardware-accelerated watermarker)
    $wmOutDir = Join-Path $repoRoot 'app/build/watermark'
    if (Test-Path -LiteralPath $wmOutDir) {
        Remove-Item -LiteralPath $wmOutDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $wmOutDir -Force | Out-Null
    $wmExe = Join-Path $wmOutDir 'WatermarkEngine.exe'
    $wmSource = Join-Path $repoRoot 'app/native/WatermarkEngine.cs'
    & $compiler /nologo /utf8output /codepage:65001 /target:exe /platform:x64 /optimize+ `
        /r:System.Web.Extensions.dll `
        /r:System.Drawing.dll `
        ('/out:' + $wmExe) $wmSource
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $wmExe)) {
        throw 'WatermarkEngine C# compilation failed.'
    }
    $wmHash = (Get-FileHash -LiteralPath $wmExe -Algorithm SHA256).Hash.ToLowerInvariant()
    $wmManifest = "{`n  `"sha256`": `"$wmHash`"`n}`n"
    [IO.File]::WriteAllText((Join-Path $wmOutDir 'engine.json'), $wmManifest, $utf8NoBom)

    Write-Host "Native helpers built: PeriodKeeper.exe, JianYingEngine.exe ($((Get-Item $engineExe).Length) bytes), WatermarkEngine.exe ($((Get-Item $wmExe).Length) bytes)"
} finally { Pop-Location }
