Unicode true
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"
!include "generated-update-config.nsh"

Name "XM剪辑台 轻量更新"
OutFile "${UPDATE_OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\XM剪辑台"
InstallDirRegKey HKCU "Software\Xiaoma\EditingStudio" "InstallLocation"
RequestExecutionLevel user
ManifestSupportedOS all
ManifestDPIAware true
SetCompressor /SOLID lzma
SetCompressorDictSize 16
BrandingText "XM剪辑台 · 轻量热更新包 (<2MB)"
ShowInstDetails show
VIProductVersion "${APP_FILE_VERSION}"
VIAddVersionKey /LANG=2052 "ProductName" "XM剪辑台"
VIAddVersionKey /LANG=2052 "FileDescription" "XM剪辑台轻量更新包"
VIAddVersionKey /LANG=2052 "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=2052 "ProductVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=2052 "CompanyName" "小马"

!define PRODUCT_KEY "Software\Xiaoma\EditingStudio"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaomaEditingStudio"

Section "Update"
  SetShellVarContext current
  SetRegView 64
  ReadRegStr $0 HKCU "${PRODUCT_KEY}" "InstallLocation"
  ${If} $0 != ""
    StrCpy $INSTDIR $0
  ${EndIf}

  ; Wait up to 8 seconds for the main app to close during auto-update restart
  nsExec::ExecToStack 'taskkill /F /IM PeriodKeeper.exe /IM JianYingEngine.exe /IM WatermarkEngine.exe'
  Pop $1
  Pop $1

  StrCpy $2 0
  waitLoop:
    System::Call 'kernel32::CreateFileW(w "$INSTDIR\resources\app.asar", i 0x40000000, i 0, p 0, i 3, i 0, p 0) p.r3'
    IntCmp $3 -1 stillLocked
    System::Call 'kernel32::CloseHandle(p r3)'
    Goto readyToWrite
  stillLocked:
    IntOp $2 $2 + 1
    IntCmp $2 20 forceCloseMain waitSleep waitSleep
  waitSleep:
    Sleep 300
    Goto waitLoop
  forceCloseMain:
    nsExec::ExecToStack 'taskkill /F /IM 小马剪辑台.exe'
    Pop $1
    Pop $1
    Sleep 400

  readyToWrite:
  RMDir /r "$APPDATA\xm-editing-studio\jianying-ai\engine"
  RMDir /r "$APPDATA\XM剪辑台\jianying-ai\engine"
  RMDir /r "$APPDATA\xm-editing-studio-source\jianying-ai\engine"
  RMDir /r "$APPDATA\XM剪辑台\watermark\watermark-engine"

  SetOverwrite on
  !include "generated-update-install.nsh"

  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${APP_VERSION}"

  IfFileExists "$INSTDIR\小马剪辑台.exe" 0 doneUpdate
    Exec '"$INSTDIR\小马剪辑台.exe"'
  doneUpdate:
SectionEnd
