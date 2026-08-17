; Custom NSIS bits for upgrade-friendly installs (electron-builder include)
!macro customHeader
  ; Same appId reinstall upgrades in place; keep user data
!macroend

!macro customInstall
  ; After files are written — nothing special required
!macroend

!macro customUnInstall
  ; Keep AppData (tags, ratings, root path) — deleteAppDataOnUninstall is false
!macroend
