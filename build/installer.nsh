; Custom NSIS bits for upgrade-friendly installs (electron-builder include)
!macro customHeader
  ; Same appId reinstall upgrades in place; keep user data
!macroend

!macro preInit
  SetRegView 64
!macroend

!macro customInstall
  ; Recreate shortcuts with bundled .ico (customInstall runs after default links)
  StrCpy $0 "$INSTDIR\resources\icons\icon.ico"
  IfFileExists $0 0 skip_icon_shortcuts
    CreateShortCut "$newDesktopLink" "$appExe" "" "$0" 0 "" "" "${APP_DESCRIPTION}"
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$0" 0 "" "" "${APP_DESCRIPTION}"
  skip_icon_shortcuts:
!macroend

!macro customUnInstall
  ; Keep AppData (tags, ratings, root path) — deleteAppDataOnUninstall is false
!macroend
