@echo off
setlocal
cd /d "%~dp0"
title ConnectIQ v0.4.0 Launcher

if not exist "package.json" (
  echo [ERROR] package.json was not found in %CD%.
  pause
  exit /b 1
)
if not exist "functions\package.json" (
  echo [ERROR] functions\package.json was not found.
  pause
  exit /b 1
)

start "ConnectIQ Backend v0.4.0" cmd /k "cd /d "%CD%\functions" && npm run dev"
timeout /t 2 /nobreak >nul
start "ConnectIQ Frontend v0.4.0" cmd /k "cd /d "%CD%" && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173/internet"
exit /b 0
