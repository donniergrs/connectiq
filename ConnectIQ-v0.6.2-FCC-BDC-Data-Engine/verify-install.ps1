$ErrorActionPreference = "Stop"
$target = "C:\connectiqvscode"
Set-Location $target
Write-Host "ConnectIQ v0.6.2 verification" -ForegroundColor Cyan
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
if ($version -ne "0.6.2") { throw "Expected version 0.6.1 but found $version" }
& npm run verify
if ($LASTEXITCODE -ne 0) { throw "Verification failed." }
& node --check functions\index.js
if ($LASTEXITCODE -ne 0) { throw "Backend syntax verification failed." }
Write-Host "ConnectIQ v0.6.2 verification PASSED." -ForegroundColor Green
Read-Host "Press Enter to close"
