# Claudio Desktop Launcher
# Double-click this file to open Claudio as a desktop app

Write-Host "Starting Claudio desktop window..." -ForegroundColor Cyan
Write-Host ""

$healthUrl = "http://localhost:8080/health"
$appUrl = "http://localhost:8080"

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
    Write-Host "[OK] Server is running" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Server not running, starting it..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WindowStyle Minimized
    Write-Host "[INFO] Waiting for server to start (3s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

# Find Edge browser
$edgePaths = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)

$edge = $edgePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($edge) {
    Write-Host "[OK] Opening desktop window..." -ForegroundColor Green
    Start-Process -FilePath $edge -ArgumentList "--app=$appUrl"
} else {
    Write-Host "[ERROR] Edge browser not found. Opening with default browser..." -ForegroundColor Red
    Start-Process $appUrl
}

Write-Host ""
Write-Host "Done! Close the browser window to exit." -ForegroundColor Gray
