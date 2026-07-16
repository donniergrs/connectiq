@echo off
setlocal EnableExtensions
chcp 65001 >nul
if defined CONNECTIQ_TARGET (set "TARGET=%CONNECTIQ_TARGET%") else (set "TARGET=C:\connectiqvscode")
set "MARKER=%TARGET%\.connectiq-last-backup.txt"

if not exist "%MARKER%" (echo ERROR: No rollback marker found at %MARKER%& pause & exit /b 1)
set /p BACKUP=<"%MARKER%"
if not exist "%BACKUP%" (echo ERROR: Backup folder not found: %BACKUP%& pause & exit /b 1)

echo This will restore:
echo %BACKUP%
echo to:
echo %TARGET%
echo.
choice /C YN /M "Continue with rollback"
if errorlevel 2 exit /b 0

robocopy "%BACKUP%" "%TARGET%" /MIR /XD .git node_modules dist >nul
if errorlevel 8 (echo ERROR: Rollback copy failed.& pause & exit /b 1)
cd /d "%TARGET%"
call npm install || (echo ERROR: npm install failed after rollback.& pause & exit /b 1)
call npm run build || (echo ERROR: Build failed after rollback.& pause & exit /b 1)

echo Rollback completed successfully.
pause
exit /b 0
