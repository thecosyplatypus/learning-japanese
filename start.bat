@echo off
rem Learning Japanese - launch helper.
rem First run: installs the Electron runtime automatically, then starts the app.
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" goto run
echo Installing Electron for the first time (one-time download, may take a minute)...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get it from https://nodejs.org and try again.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo Installation failed. Make sure Node.js is installed from https://nodejs.org, then try again.
  pause
  exit /b 1
)
:run
start "" "node_modules\electron\dist\electron.exe" .