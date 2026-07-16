@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-install.ps1"
if errorlevel 1 pause
