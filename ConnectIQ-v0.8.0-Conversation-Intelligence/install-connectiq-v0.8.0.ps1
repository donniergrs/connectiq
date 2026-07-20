$ErrorActionPreference = "Stop"
$releaseRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = (Get-Location).Path
if (-not (Test-Path (Join-Path $project "functions\index.js"))) { Write-Host "Run this installer from the root of C:\connectiqvscode" -ForegroundColor Red; exit 1 }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $project ".connectiq-backups\v0.8.0-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
$files = @(
 "functions\services\toolRouter\conversationOrchestrator.js",
 "functions\services\toolRouter\customerMemoryService.js",
 "functions\services\toolRouter\intentAnalyzer.js",
 "functions\services\toolRouter\routerService.js",
 "functions\services\aiAdvisor\responseBuilder.js",
 "functions\test\conversationIntelligence.test.js"
)
foreach ($file in $files) { $dest=Join-Path $project $file; if(Test-Path $dest){$b=Join-Path $backup $file; New-Item -ItemType Directory -Force -Path (Split-Path $b) | Out-Null; Copy-Item $dest $b -Force}; $src=Join-Path $releaseRoot ("payload\"+$file); New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null; Copy-Item $src $dest -Force }
$backup | Set-Content (Join-Path $project ".connectiq-v0.8.0-last-backup.txt")
Push-Location (Join-Path $project "functions")
try { npm test; if($LASTEXITCODE -ne 0){throw "Function tests failed"} } finally { Pop-Location }
Write-Host "ConnectIQ v0.8.0 Conversation Intelligence installed and verified." -ForegroundColor Green
Write-Host "Backup: $backup"
