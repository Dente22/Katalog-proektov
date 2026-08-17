@echo off
cd /d "%~dp0"
echo Building NSIS installer with in-place upgrade support...
call npm install
if errorlevel 1 (
  echo npm install failed
  pause
  exit /b 1
)
call npm run dist
if errorlevel 1 (
  echo Build failed
  pause
  exit /b 1
)
echo.
echo Done.
echo Installer: release\Katalog-proektov-Setup-*.exe
echo Manifest:  release\update-manifest.json
echo.
echo First time: run the Setup.exe
echo Later: build again, open the app -^> "Обновление" (or it asks on startup)
pause
