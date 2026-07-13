@echo off
setlocal
cd /d %~dp0
 echo Installing ConnectIQ v0.3.0 dependencies...
call npm install
if errorlevel 1 goto error
 echo Building ConnectIQ v0.3.0...
call npm run build
if errorlevel 1 goto error
 echo.
 echo Mission001_v2 installed successfully.
 echo Start your backend, then run: npm run dev
exit /b 0
:error
 echo.
 echo Installation failed. Review the error above.
exit /b 1
