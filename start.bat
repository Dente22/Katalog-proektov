@echo off
cd /d "%~dp0"

REM Prefer installed Start Menu / default install path is hard; use local release unpacked or start installed via Start Menu name.
set "SETUP="
for %%F in ("%~dp0release\Katalog-proektov-Setup-*.exe") do set "SETUP=%%~fF"

set "DIR_EXE=%~dp0release\win-unpacked\ProjectCatalog.exe"
set "INSTALLED=%LOCALAPPDATA%\Programs\Каталог проектов\ProjectCatalog.exe"
if not exist "%INSTALLED%" set "INSTALLED=%LOCALAPPDATA%\Programs\project-cards\ProjectCatalog.exe"

if exist "%INSTALLED%" (
  start "" "%INSTALLED%"
  exit /b 0
)
if exist "%DIR_EXE%" (
  start "" "%DIR_EXE%"
  exit /b 0
)

if not exist node_modules\electron (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed
    pause
    exit /b 1
  )
)

echo No installed/built app found. Building installer is recommended: build.bat
echo Starting dev mode (Task Manager shows Electron)...
start "" npm start
