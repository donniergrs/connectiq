$ErrorActionPreference = "Stop"
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = "C:\connectiqvscode"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = "C:\connectiq-backups"
$backup = Join-Path $backupRoot "connectiq-$stamp"

Write-Host "ConnectIQ v0.7.4 installer" -ForegroundColor Cyan
if ($source -match "\\AppData\\Local\\Temp\\") {
  throw "Do not run the installer from inside the ZIP preview. Extract the ZIP to a normal folder first."
}
if (!(Test-Path (Join-Path $source "package.json"))) { throw "Release package is incomplete: package.json is missing." }
if (!(Test-Path (Join-Path $source "src"))) { throw "Release package is incomplete: src is missing." }

New-Item $backupRoot -ItemType Directory -Force | Out-Null
if (!(Test-Path $target)) { New-Item $target -ItemType Directory -Force | Out-Null }
New-Item $backup -ItemType Directory -Force | Out-Null

Write-Host "[1/6] Backing up current installation to $backup"
& robocopy $target $backup /E /XD node_modules dist .git /XF .env *.sqlite *.sqlite-wal *.sqlite-shm /R:2 /W:1 /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -ge 8) { throw "Backup failed with Robocopy code $LASTEXITCODE" }

Write-Host "[2/6] Installing complete release"
& robocopy $source $target /E /XD node_modules .git release-output /XF .env *.sqlite *.sqlite-wal *.sqlite-shm /R:2 /W:1 /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -ge 8) { throw "File installation failed with Robocopy code $LASTEXITCODE" }

Set-Location $target
Write-Host "[3/6] Installing frontend dependencies"
& npm ci
if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }

Write-Host "[4/6] Installing backend dependencies"
Push-Location functions
& npm ci
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Backend dependency installation failed." }
Pop-Location

Write-Host "[5/6] Running quality gate"
& npm run verify
if ($LASTEXITCODE -ne 0) { throw "Quality gate failed." }

Write-Host "[6/6] Recording rollback point"
Set-Content -Path (Join-Path $target '.connectiq-last-backup') -Value $backup
Write-Host "ConnectIQ v0.7.4 installation complete." -ForegroundColor Green
Read-Host "Press Enter to close"
