@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Building Windows installer (NSIS Setup.exe)...
echo.

where node >nul 2>&1
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\node-win-x64\node.exe" (
    set "PATH=%LOCALAPPDATA%\node-win-x64;%PATH%"
  )
)

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install LTS from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

node -v
call npm -v
echo.

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
echo Run the Setup.exe to install "Каталог проектов".
echo Later updates: build again, then in the app click "Обновление".
pause
