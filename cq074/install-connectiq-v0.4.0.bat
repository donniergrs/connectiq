@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title ConnectIQ v0.4.0 Installer

set "SOURCE=%~dp0"
set "DEFAULT_TARGET=C:\connectiqvscode"

cls
echo ===============================================================
echo        ConnectIQ v0.4.0 - One-Click Cumulative Installer
echo ===============================================================
echo.
echo This installer uses the application files in this extracted folder.
echo It preserves your root .env and functions\.env files.
echo.

if not exist "%SOURCE%package.json" (
  echo [ERROR] package.json is missing beside this installer.
  echo Extract the COMPLETE ZIP first, then run this file from the extracted folder.
  goto :fail
)
if not exist "%SOURCE%functions\package.json" (
  echo [ERROR] functions\package.json is missing beside this installer.
  echo Extract the COMPLETE ZIP first, then run this file from the extracted folder.
  goto :fail
)

set /p "TARGET=Install folder [%DEFAULT_TARGET%]: "
if "%TARGET%"=="" set "TARGET=%DEFAULT_TARGET%"

where node >nul 2>nul || (
  echo [ERROR] Node.js was not found.
  goto :fail
)
where npm >nul 2>nul || (
  echo [ERROR] npm was not found.
  goto :fail
)

echo.
echo Node.js:
node --version
echo npm:
call npm --version

if not exist "%TARGET%" mkdir "%TARGET%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul ^| find "="') do set "DT=%%I"
if not defined DT set "DT=%RANDOM%%RANDOM%"
set "STAMP=!DT:~0,8!_!DT:~8,6!"
set "BACKUP=%TARGET%_backup_v0.4.0_!STAMP!"

set "ROOT_ENV_TEMP=%TEMP%\connectiq_root_env_%RANDOM%.tmp"
set "FUNCTIONS_ENV_TEMP=%TEMP%\connectiq_functions_env_%RANDOM%.tmp"
if exist "%TARGET%\.env" copy /Y "%TARGET%\.env" "%ROOT_ENV_TEMP%" >nul
if exist "%TARGET%\functions\.env" copy /Y "%TARGET%\functions\.env" "%FUNCTIONS_ENV_TEMP%" >nul

echo.
echo [1/6] Creating rollback backup...
if exist "%TARGET%\package.json" (
  mkdir "%BACKUP%" >nul 2>nul
  robocopy "%TARGET%" "%BACKUP%" /E /XD node_modules dist .git .firebase connectiq_v0.4.0 /XF .env >nul
  if errorlevel 8 (
    echo [ERROR] Backup could not be created.
    goto :restore_env_fail
  )
  if exist "%ROOT_ENV_TEMP%" copy /Y "%ROOT_ENV_TEMP%" "%BACKUP%\.env" >nul
  if exist "%FUNCTIONS_ENV_TEMP%" (
    if not exist "%BACKUP%\functions" mkdir "%BACKUP%\functions"
    copy /Y "%FUNCTIONS_ENV_TEMP%" "%BACKUP%\functions\.env" >nul
  )
  echo Backup created: %BACKUP%
) else (
  echo No prior installation detected. Continuing with a clean install.
)

echo.
echo [2/6] Copying ConnectIQ v0.4.0 files...
robocopy "%SOURCE%" "%TARGET%" /E /XD node_modules dist .git .firebase /XF .env install-connectiq-v0.4.0.bat README_FIRST.txt >nul
if errorlevel 8 (
  echo [ERROR] Application files could not be copied.
  goto :restore_env_fail
)
copy /Y "%SOURCE%install-connectiq-v0.4.0.bat" "%TARGET%\install-connectiq-v0.4.0.bat" >nul
if exist "%SOURCE%README_FIRST.txt" copy /Y "%SOURCE%README_FIRST.txt" "%TARGET%\README_FIRST.txt" >nul

if exist "%ROOT_ENV_TEMP%" copy /Y "%ROOT_ENV_TEMP%" "%TARGET%\.env" >nul
if exist "%FUNCTIONS_ENV_TEMP%" (
  if not exist "%TARGET%\functions" mkdir "%TARGET%\functions"
  copy /Y "%FUNCTIONS_ENV_TEMP%" "%TARGET%\functions\.env" >nul
)
del /Q "%ROOT_ENV_TEMP%" "%FUNCTIONS_ENV_TEMP%" >nul 2>nul

if not exist "%TARGET%\.env" echo [WARNING] Root .env is missing: %TARGET%\.env
if not exist "%TARGET%\functions\.env" echo [WARNING] Backend .env is missing: %TARGET%\functions\.env

echo.
echo [3/6] Installing frontend dependencies...
pushd "%TARGET%"
call npm install
if errorlevel 1 goto :pop_fail

echo.
echo [4/6] Installing backend dependencies...
pushd functions
call npm install
if errorlevel 1 goto :pop2_fail
popd

echo.
echo [5/6] Validating production build...
call npm run build
if errorlevel 1 goto :pop_fail

echo.
echo [6/6] Installation complete.
echo.
echo Version: 0.4.0 - AI Advisor
echo Location: %TARGET%
echo Launcher: %TARGET%\start-connectiq-v0.4.0.bat
echo.
set /p "LAUNCH=Launch ConnectIQ now? (Y/N): "
if /I "%LAUNCH%"=="Y" call "%TARGET%\start-connectiq-v0.4.0.bat"
popd
exit /b 0

:pop2_fail
popd
:pop_fail
popd
goto :fail

:restore_env_fail
if exist "%ROOT_ENV_TEMP%" copy /Y "%ROOT_ENV_TEMP%" "%TARGET%\.env" >nul
if exist "%FUNCTIONS_ENV_TEMP%" (
  if not exist "%TARGET%\functions" mkdir "%TARGET%\functions"
  copy /Y "%FUNCTIONS_ENV_TEMP%" "%TARGET%\functions\.env" >nul
)
del /Q "%ROOT_ENV_TEMP%" "%FUNCTIONS_ENV_TEMP%" >nul 2>nul

:fail
echo.
echo Installation stopped. Your existing project was not intentionally deleted.
echo.
pause
exit /b 1
