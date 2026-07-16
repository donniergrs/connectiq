param([string]$Version = "v0.6.0")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "release-output"
$stage = Join-Path $out "ConnectIQ-$Version"
Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue
New-Item $stage -ItemType Directory -Force | Out-Null
$exclude = @('.git','node_modules','release-output','.firebase','.env','functions/.env')
Get-ChildItem $root -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
  Copy-Item $_.FullName $stage -Recurse -Force
}
Copy-Item (Join-Path $root 'scripts/install-connectiq.ps1') $stage -Force
Copy-Item (Join-Path $root 'scripts/verify-install.ps1') $stage -Force
Copy-Item (Join-Path $root 'scripts/rollback.ps1') $stage -Force
Copy-Item (Join-Path $root 'scripts/install-connectiq.bat') $stage -Force
Copy-Item (Join-Path $root 'scripts/verify-install.bat') $stage -Force
Copy-Item (Join-Path $root 'scripts/rollback.bat') $stage -Force
$zip = Join-Path $out "ConnectIQ-$Version-Revenue-Platform.zip"
Compress-Archive -Path "$stage\*" -DestinationPath $zip -Force
Write-Host "Created $zip"
