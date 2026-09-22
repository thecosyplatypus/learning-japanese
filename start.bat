@echo off
rem Learning Japanese - launch helper.
rem Runs the Electron binary directly (no npx), so no console stays open.
rem Tip: double-click "Learning Japanese.vbs" for zero console flash at all.
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" .
) else (
  echo Electron is not installed yet. Run "npm install" first.
  pause
)