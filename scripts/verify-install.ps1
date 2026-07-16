$ErrorActionPreference = "Stop"
Set-Location "C:\connectiqvscode"
Write-Host "Verifying ConnectIQ installation" -ForegroundColor Cyan
npm run verify
Write-Host "Verification passed." -ForegroundColor Green
Read-Host "Press Enter to close"
