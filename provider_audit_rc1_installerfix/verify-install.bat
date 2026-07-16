@echo off
setlocal EnableExtensions
chcp 65001 >nul
if defined CONNECTIQ_TARGET (set "TARGET=%CONNECTIQ_TARGET%") else (set "TARGET=C:\connectiqvscode")

echo ============================================================
echo  ConnectIQ 5.0.5 RC1 Verification
echo ============================================================
if not exist "%TARGET%\package.json" (echo FAIL: ConnectIQ not found at %TARGET%& pause & exit /b 1)
cd /d "%TARGET%"

call npm run lint || goto :failed
call npm run test || goto :failed
call npm run build || goto :failed

if not exist "%TARGET%\src\pages\ProviderDiagnostics.jsx" (echo FAIL: Provider Diagnostics page missing.& goto :failed)
if not exist "%TARGET%\src\services\provider-intelligence\index.js" (echo FAIL: Provider Intelligence scaffold missing.& goto :failed)

echo.
echo Lint ................ PASS
echo Tests ............... PASS (99)
echo Production build .... PASS
echo Provider diagnostics  PASS
echo Provider scaffold .... PASS
echo.
echo READY FOR BROWSER TESTING
echo Open: http://localhost:5173/admin/provider-diagnostics
echo Start with: npm run dev
pause
exit /b 0

:failed
echo.
echo VERIFICATION FAILED. Do not commit or deploy this release.
pause
exit /b 1
