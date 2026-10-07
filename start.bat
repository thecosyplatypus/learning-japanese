@echo off
rem Learning Japanese - launch helper.
rem First run: installs Node.js and Electron automatically, then starts the app.
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" goto run
echo First-run setup: installing Node.js and Electron (one-time download)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
if errorlevel 1 (
  echo Setup failed. Check your internet connection and try again.
  pause
  exit /b 1
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo Setup finished, but Electron is still missing. Run setup.ps1 manually for details.
  pause
  exit /b 1
)
:run
start "" "node_modules\electron\dist\electron.exe" .