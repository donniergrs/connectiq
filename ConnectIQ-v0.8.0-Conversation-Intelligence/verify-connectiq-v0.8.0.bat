@echo off
if not exist functions\index.js (echo Run this from C:\connectiqvscode & pause & exit /b 1)
cd functions
call npm test
set ERR=%ERRORLEVEL%
cd ..
if %ERR%==0 (echo ConnectIQ v0.8.0 verification PASSED) else (echo Verification FAILED)
pause
exit /b %ERR%
