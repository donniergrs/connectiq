$ErrorActionPreference = "Stop"
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = "C:\connectiqvscode"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "C:\connectiq-backups\connectiq-$stamp"
Write-Host "ConnectIQ installer" -ForegroundColor Cyan
if (!(Test-Path $target)) { New-Item $target -ItemType Directory -Force | Out-Null }
New-Item $backup -ItemType Directory -Force | Out-Null
Write-Host "Backing up current installation to $backup"
robocopy $target $backup /E /XD node_modules dist .git provider_audit_rc1_installerfix /XF .env functions\.env /R:2 /W:1 /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Backup failed with Robocopy code $LASTEXITCODE" }
Write-Host "Installing release files"
robocopy $source $target /E /XD node_modules .git release-output /XF .env functions\.env install-connectiq.ps1 verify-install.ps1 rollback.ps1 install-connectiq.bat verify-install.bat rollback.bat /R:2 /W:1 /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { throw "File installation failed with Robocopy code $LASTEXITCODE" }
Set-Location $target
Write-Host "Installing frontend dependencies"
npm ci
Write-Host "Installing functions dependencies"
Push-Location functions
npm ci
Pop-Location
Write-Host "Running quality gate"
npm run verify
Set-Content -Path (Join-Path $target '.connectiq-last-backup') -Value $backup
Write-Host "ConnectIQ installation complete." -ForegroundColor Green
Read-Host "Press Enter to close"
