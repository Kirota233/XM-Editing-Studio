param(
  [string]$Version = "",
  [string]$PackagedDir = "",
  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$PackageJson = Get-Content (Join-Path $Root "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = [string]$PackageJson.version
}
$Version = $Version.TrimStart('v', 'V')

$VersionParts = $Version.Split('.')
while ($VersionParts.Count -lt 4) {
  $VersionParts += "0"
}
$FileVersion = ($VersionParts[0..3] -join '.')

if ([string]::IsNullOrWhiteSpace($PackagedDir)) {
  $PackagedDir = Join-Path $Root "artifacts\XM剪辑台-win32-x64"
}
if (-not (Test-Path $PackagedDir)) {
  throw "未找到已打包的应用目录: $PackagedDir (请先运行 npm run package)"
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $Root "artifacts\release"
}
if (Test-Path $OutputDir) {
  Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Resolve-Makensis {
  $cmd = Get-Command makensis.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
    "${env:ProgramFiles}\NSIS\makensis.exe",
    "C:\ProgramData\chocolatey\bin\makensis.exe"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }
  throw "未找到 NSIS (makensis.exe)，请先安装 NSIS (例如 choco install nsis)"
}

function Resolve-Csc {
  $cmd = Get-Command csc.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }
  throw "未找到 .NET Framework C# 编译器 (csc.exe)"
}

function Get-FileSha256Hex([string]$Path) {
  return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$Utf8Bom = [System.Text.UTF8Encoding]::new($true)
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$InstallerDir = Join-Path $Root "packaging\installer"
$UpdateDir = Join-Path $Root "packaging\update"
$IconPath = Join-Path $Root "app\assets\app-icon.ico"
$InstallerGuidePath = Join-Path $InstallerDir "使用说明.txt"
$UpdateGuidePath = Join-Path $UpdateDir "使用说明.txt"
$ChangelogSource = Join-Path $Root "CHANGELOG-$Version.md"
if (-not (Test-Path $ChangelogSource)) {
  $ChangelogSource = Join-Path $Root "CHANGELOG-1.3.0.md"
}
$VerificationSource = Join-Path $Root "VERIFICATION.md"

$SetupExeName = "XM-Editing-Studio-$Version-Windows-x64-Setup.exe"
$SetupExePath = Join-Path $OutputDir $SetupExeName
$FullUpdateZipName = "XM-Editing-Studio-$Version-Full-Update.zip"
$FullUpdateZipPath = Join-Path $OutputDir $FullUpdateZipName
$FullUpdateExeName = "XM-Update-$Version-Full.exe"

Write-Host "[1/4] 生成 NSIS 安装包: $SetupExeName"
$GenConfigNsh = Join-Path $InstallerDir "generated-config.nsh"
$GenInstallNsh = Join-Path $InstallerDir "generated-install.nsh"
$GenUninstallNsh = Join-Path $InstallerDir "generated-uninstall.nsh"
$GenUninstallDirsNsh = Join-Path $InstallerDir "generated-uninstall-dirs.nsh"

try {
  $PackagedRoot = (Resolve-Path $PackagedDir).Path.TrimEnd('\')
  $AllFiles = Get-ChildItem -Path $PackagedRoot -Recurse -File | Sort-Object FullName
  $AllDirs = Get-ChildItem -Path $PackagedRoot -Recurse -Directory | Sort-Object { $_.FullName.Length } -Descending

  $TotalBytes = ($AllFiles | Measure-Object -Property Length -Sum).Sum
  if (Test-Path $InstallerGuidePath) {
    $TotalBytes += (Get-Item $InstallerGuidePath).Length
  }
  $InstalledSizeKb = [Math]::Max(1, [int][Math]::Ceiling($TotalBytes / 1024.0))

  $ConfigLines = @(
    "!define APP_VERSION `"$Version`"",
    "!define APP_FILE_VERSION `"$FileVersion`"",
    "!define OUTPUT_FILE `"$SetupExePath`"",
    "!define APP_ICON `"$IconPath`"",
    "!define INSTALLED_SIZE_KB $InstalledSizeKb"
  )
  [System.IO.File]::WriteAllLines($GenConfigNsh, $ConfigLines, $Utf8Bom)

  $InstallLines = [System.Collections.Generic.List[string]]::new()
  $UninstallLines = [System.Collections.Generic.List[string]]::new()
  $CurrentOutDir = $null

  foreach ($File in $AllFiles) {
    $RelPath = $File.FullName.Substring($PackagedRoot.Length + 1)
    $RelDir = Split-Path -Parent $RelPath
    $TargetOutDir = if ([string]::IsNullOrEmpty($RelDir)) { "`$INSTDIR" } else { "`$INSTDIR\$RelDir" }
    if ($TargetOutDir -ne $CurrentOutDir) {
      $InstallLines.Add("SetOutPath `"$TargetOutDir`"")
      $CurrentOutDir = $TargetOutDir
    }
    $InstallLines.Add("File `"$($File.FullName)`"")
    $UninstallLines.Add("Delete `"`$INSTDIR\$RelPath`"")
  }

  if (Test-Path $InstallerGuidePath) {
    if ($CurrentOutDir -ne "`$INSTDIR") {
      $InstallLines.Add("SetOutPath `"`$INSTDIR`"")
    }
    $InstallLines.Add("File `"$InstallerGuidePath`"")
    $UninstallLines.Add("Delete `"`$INSTDIR\使用说明.txt`"")
  }

  $UninstallDirLines = [System.Collections.Generic.List[string]]::new()
  foreach ($Dir in $AllDirs) {
    $RelDir = $Dir.FullName.Substring($PackagedRoot.Length + 1)
    $UninstallDirLines.Add("RMDir `"`$INSTDIR\$RelDir`"")
  }

  [System.IO.File]::WriteAllLines($GenInstallNsh, $InstallLines, $Utf8Bom)
  [System.IO.File]::WriteAllLines($GenUninstallNsh, $UninstallLines, $Utf8Bom)
  [System.IO.File]::WriteAllLines($GenUninstallDirsNsh, $UninstallDirLines, $Utf8Bom)

  $Makensis = Resolve-Makensis
  & $Makensis /V2 (Join-Path $InstallerDir "setup.nsi")
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $SetupExePath)) {
    throw "NSIS 安装包构建失败"
  }
} finally {
  Remove-Item $GenConfigNsh, $GenInstallNsh, $GenUninstallNsh, $GenUninstallDirsNsh -Force -ErrorAction SilentlyContinue
}

Write-Host "[2/4] 生成完整更新包: $FullUpdateZipName"
$StageUpdateRoot = Join-Path $Root "artifacts\.stage-full-update"
if (Test-Path $StageUpdateRoot) {
  Remove-Item $StageUpdateRoot -Recurse -Force
}
$PayloadDir = Join-Path $StageUpdateRoot "payload"
New-Item -ItemType Directory -Force -Path $PayloadDir | Out-Null

try {
  Copy-Item -Path (Join-Path $PackagedRoot "*") -Destination $PayloadDir -Recurse -Force
  if (Test-Path $InstallerGuidePath) {
    Copy-Item -Path $InstallerGuidePath -Destination (Join-Path $PayloadDir "使用说明.txt") -Force
  }

  $PayloadRoot = (Resolve-Path $PayloadDir).Path.TrimEnd('\')
  $PayloadFiles = Get-ChildItem -Path $PayloadRoot -Recurse -File | Sort-Object FullName
  $ManifestEntries = [System.Collections.Generic.List[object]]::new()

  foreach ($File in $PayloadFiles) {
    $RelPath = $File.FullName.Substring($PayloadRoot.Length + 1)
    $ManifestEntries.Add([ordered]@{
      name  = $RelPath
      hash  = (Get-FileSha256Hex $File.FullName)
      bytes = [int64]$File.Length
    })
  }

  $ManifestObj = [ordered]@{
    product = "XM剪辑台"
    version = $Version
    files   = $ManifestEntries
  }
  $ManifestPath = Join-Path $StageUpdateRoot "manifest.json"
  $ManifestJson = $ManifestObj | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText($ManifestPath, $ManifestJson, $Utf8NoBom)

  $ManifestSha256 = Get-FileSha256Hex $ManifestPath
  $ManifestHashCsPath = Join-Path $Root "artifacts\.FullManifestHash.cs"
  $ManifestHashCs = @"
internal static class FullManifestHash
{
    public const string Value = "$ManifestSha256";
}
"@
  [System.IO.File]::WriteAllText($ManifestHashCsPath, $ManifestHashCs, $Utf8Bom)

  $Csc = Resolve-Csc
  $FullUpdaterCs = Join-Path $UpdateDir "FullUpdater.cs"
  $FullUpdateExePath = Join-Path $StageUpdateRoot $FullUpdateExeName
  & $Csc /nologo /target:winexe /platform:x64 /optimize+ `
    "/win32icon:$IconPath" `
    /r:System.Web.Extensions.dll `
    /r:System.Windows.Forms.dll `
    /r:System.Drawing.dll `
    "/out:$FullUpdateExePath" `
    $FullUpdaterCs $ManifestHashCsPath
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $FullUpdateExePath)) {
    throw "FullUpdater.exe 编译失败"
  }

  if (Test-Path $UpdateGuidePath) {
    Copy-Item -Path $UpdateGuidePath -Destination (Join-Path $StageUpdateRoot "使用说明.txt") -Force
  }
  if (Test-Path $ChangelogSource) {
    Copy-Item -Path $ChangelogSource -Destination (Join-Path $StageUpdateRoot "更新说明.md") -Force
  }
  $RestoreCmdPath = Join-Path $StageUpdateRoot "Restore-Previous.cmd"
  $RestoreCmdContent = "@echo off`r`n`"%~dp0$FullUpdateExeName`" --restore`r`n"
  [System.IO.File]::WriteAllText($RestoreCmdPath, $RestoreCmdContent, $Utf8NoBom)

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path $FullUpdateZipPath) {
    Remove-Item $FullUpdateZipPath -Force
  }
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $StageUpdateRoot,
    $FullUpdateZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )
} finally {
  Remove-Item $StageUpdateRoot -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $Root "artifacts\.FullManifestHash.cs") -Force -ErrorAction SilentlyContinue
}

Write-Host "[3/4] 整理规范化 Release 说明与校验文档"
if (Test-Path $ChangelogSource) {
  $ChangelogDestName = if ($Version -eq "1.3.0") { "CHANGELOG-1.2-to-1.3.md" } else { "CHANGELOG-$Version.md" }
  Copy-Item -Path $ChangelogSource -Destination (Join-Path $OutputDir $ChangelogDestName) -Force
}
if (Test-Path $InstallerGuidePath) {
  Copy-Item -Path $InstallerGuidePath -Destination (Join-Path $OutputDir "Installation-Guide-$Version.txt") -Force
}
if (Test-Path $UpdateGuidePath) {
  Copy-Item -Path $UpdateGuidePath -Destination (Join-Path $OutputDir "Update-Guide-$Version.txt") -Force
}
if (Test-Path $VerificationSource) {
  Copy-Item -Path $VerificationSource -Destination (Join-Path $OutputDir "VERIFICATION-$Version.md") -Force
}

Write-Host "[4/4] 生成 SHA256SUMS.txt"
$ReleaseFiles = Get-ChildItem -Path $OutputDir -File | Where-Object { $_.Name -ne "SHA256SUMS.txt" } | Sort-Object Name
$ShaLines = foreach ($File in $ReleaseFiles) {
  $Hash = Get-FileSha256Hex $File.FullName
  "$Hash  $($File.Name)"
}
$ShaSumsPath = Join-Path $OutputDir "SHA256SUMS.txt"
[System.IO.File]::WriteAllLines($ShaSumsPath, $ShaLines, $Utf8NoBom)

Write-Host "Release 产物已全部生成至: $OutputDir"
Get-ChildItem -Path $OutputDir -File | Select-Object Name, Length
