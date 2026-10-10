# Deploy v2 to umkm.sistemdata.id
# Usage: powershell -ExecutionPolicy Bypass -File .\deploy-v2.ps1
$ErrorActionPreference = "Stop"
$SRV  = "103.255.133.227"
$PORT = 64001
$USER = "sistekm"
$REMOTE = "/home/sistekm/htdocs/umkm.sistemdata.id"
$PLINK = "I:\Program Files\PuTTY\plink.exe"
$PSCP  = "I:\Program Files\PuTTY\pscp.exe"
$PASS  = "8AEV5k5FvPwUHc6PBciy"

Set-Location $PSScriptRoot

Write-Host "=== Building ===" -ForegroundColor Cyan
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
npm run build 2>&1 | Out-String
$ErrorActionPreference = $prevEAP

Write-Host "=== Zipping dist ===" -ForegroundColor Cyan
Remove-Item "$PSScriptRoot\dist-v2.zip" -Force -ErrorAction SilentlyContinue
Push-Location "$PSScriptRoot\dist"
Compress-Archive -Path * -DestinationPath "$PSScriptRoot\dist-v2.zip" -Force
Pop-Location
Write-Host "  Size: $([math]::Round((Get-Item "$PSScriptRoot\dist-v2.zip").Length/1MB,1)) MB"

Write-Host "=== Uploading ===" -ForegroundColor Cyan
& $PSCP -P $PORT -batch -pw $PASS "$PSScriptRoot\dist-v2.zip" "${USER}@${SRV}:${REMOTE}/dist-v2.zip" 2>&1

Write-Host "=== Extracting on server ===" -ForegroundColor Cyan
& $PLINK -ssh -P $PORT -batch -pw $PASS "${USER}@${SRV}" "cd $REMOTE && rm -rf assets data geo && unzip -o dist-v2.zip && rm -f dist-v2.zip && echo DEPLOY_OK && ls -la" 2>&1

Write-Host "=== Done: https://umkm.sistemdata.id ===" -ForegroundColor Green
