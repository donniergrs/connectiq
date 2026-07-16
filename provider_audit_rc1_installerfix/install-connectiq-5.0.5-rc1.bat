@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "RELEASE_NAME=ConnectIQ 5.0.5 RC1 - Provider Intelligence Audit"
set "SOURCE=%~dp0"
if defined CONNECTIQ_TARGET (
  set "TARGET=%CONNECTIQ_TARGET%"
) else (
  set "TARGET=C:\connectiqvscode"
)
set "BACKUP_ROOT=C:\ConnectIQ_Backups"
set "LOG=%TEMP%\connectiq-5.0.5-rc1-install-%RANDOM%.log"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul ^| find "="') do set "DT=%%I"
if not defined DT set "DT=%DATE:/=-%_%TIME::=-%"
set "STAMP=!DT:~0,8!-!DT:~8,6!"
set "BACKUP=%BACKUP_ROOT%\connectiq-before-5.0.5-rc1-!STAMP!"

echo ============================================================
echo  %RELEASE_NAME%
echo ============================================================
echo Source : %SOURCE%
echo Target : %TARGET%
echo Log    : %LOG%
echo.

where node >nul 2>&1 || (echo ERROR: Node.js is not installed or not on PATH.& pause & exit /b 1)
where npm >nul 2>&1 || (echo ERROR: npm is not installed or not on PATH.& pause & exit /b 1)
if not exist "%SOURCE%package.json" (echo ERROR: Run this installer from the extracted release folder.& pause & exit /b 1)
if not exist "%SOURCE%src" (echo ERROR: Complete release source folder is missing.& pause & exit /b 1)
if not exist "%SOURCE%functions\package.json" (echo ERROR: Complete backend package is missing.& pause & exit /b 1)

if not exist "%TARGET%" mkdir "%TARGET%"
if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"

set "ENV_TEMP=%TEMP%\connectiq-env-%RANDOM%"
mkdir "%ENV_TEMP%" >nul 2>&1
for %%F in (.env .env.local .env.development .env.production) do if exist "%TARGET%\%%F" copy /y "%TARGET%\%%F" "%ENV_TEMP%\%%F" >nul
if exist "%TARGET%\functions\.env" copy /y "%TARGET%\functions\.env" "%ENV_TEMP%\functions.env" >nul

echo [1/8] Creating restore point...
robocopy "%TARGET%" "%BACKUP%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /XJ /XD .git node_modules dist .firebase /XF *.log >"%LOG%" 2>&1
set "RC=!ERRORLEVEL!"
if !RC! GEQ 8 (
  echo ERROR: Backup failed with Robocopy code !RC!.
  echo See log: %LOG%
  type "%LOG%"
  pause
  exit /b 1
)
echo Backup created: %BACKUP%

rem Copy rollback utility before changing application files.
copy /y "%SOURCE%rollback.bat" "%TARGET%\rollback.bat" >nul 2>&1

echo [2/8] Installing complete release...
rem /E overlays the complete release without deleting unrelated local folders.
rem This avoids the access-denied failures caused by /MIR on active or legacy files.
robocopy "%SOURCE%" "%TARGET%" /E /COPY:DAT /DCOPY:DAT /R:3 /W:2 /XJ /XD .git node_modules dist .firebase /XF .env .env.local .env.development .env.production *.log >>"%LOG%" 2>&1
set "RC=!ERRORLEVEL!"
if !RC! GEQ 8 (
  echo ERROR: File installation failed with Robocopy code !RC!.
  echo See log: %LOG%
  type "%LOG%"
  goto :failed
)

for %%F in (.env .env.local .env.development .env.production) do if exist "%ENV_TEMP%\%%F" copy /y "%ENV_TEMP%\%%F" "%TARGET%\%%F" >nul
if exist "%ENV_TEMP%\functions.env" copy /y "%ENV_TEMP%\functions.env" "%TARGET%\functions\.env" >nul
>"%TARGET%\.connectiq-last-backup.txt" echo %BACKUP%

cd /d "%TARGET%"
echo [3/8] Installing frontend dependencies...
call npm install || goto :failed

echo [4/8] Installing backend dependencies...
pushd functions
call npm install || (popd & goto :failed)
popd

echo [5/8] Running lint...
call npm run lint || goto :failed

echo [6/8] Running automated tests...
call npm run test || goto :failed

echo [7/8] Building production application...
call npm run build || goto :failed

echo [8/8] Finalizing release utilities...
copy /y "%SOURCE%verify-install.bat" "%TARGET%\verify-install.bat" >nul
copy /y "%SOURCE%rollback.bat" "%TARGET%\rollback.bat" >nul
copy /y "%SOURCE%RELEASE_MANIFEST.md" "%TARGET%\RELEASE_MANIFEST.md" >nul
rmdir /s /q "%ENV_TEMP%" >nul 2>&1

echo.
echo ============================================================
echo  INSTALLATION PASSED
echo  Backup: %BACKUP%
echo  Log:    %LOG%
echo  Next: double-click verify-install.bat or run npm run dev
echo ============================================================
pause
exit /b 0

:failed
echo.
echo ============================================================
echo  INSTALLATION FAILED
echo  Your pre-install backup is safe at:
echo  %BACKUP%
echo  Installer log:
echo  %LOG%
echo  Run rollback.bat to restore the previous version.
echo ============================================================
for %%F in (.env .env.local .env.development .env.production) do if exist "%ENV_TEMP%\%%F" copy /y "%ENV_TEMP%\%%F" "%TARGET%\%%F" >nul
if exist "%ENV_TEMP%\functions.env" copy /y "%ENV_TEMP%\functions.env" "%TARGET%\functions\.env" >nul
rmdir /s /q "%ENV_TEMP%" >nul 2>&1
pause
exit /b 1
