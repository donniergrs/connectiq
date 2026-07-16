$ErrorActionPreference = "Stop"
$target = "C:\connectiqvscode"
$marker = Join-Path $target '.connectiq-last-backup'
if (!(Test-Path $marker)) { throw "No installer backup marker was found." }
$backup = (Get-Content $marker -Raw).Trim()
if (!(Test-Path $backup)) { throw "Backup folder does not exist: $backup" }
Write-Host "Restoring $backup" -ForegroundColor Yellow
robocopy $backup $target /E /R:2 /W:1 /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Rollback failed with Robocopy code $LASTEXITCODE" }
Set-Location $target
npm ci
Push-Location functions
npm ci
Pop-Location
npm run verify
Write-Host "Rollback complete." -ForegroundColor Green
Read-Host "Press Enter to close"
