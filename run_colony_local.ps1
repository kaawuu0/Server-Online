# Local Test Launcher for Windows (Optional Preview)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Minecraft AI Colony (Local Preview Mode)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$serverDir = "$PSScriptRoot\server"
$agentsDir = "$PSScriptRoot\agents"

# 1. Start Minecraft Server in a background process
Write-Host "[1/3] Starting PaperMC 1.20.4 Server on port 25565..." -ForegroundColor Green
$serverJob = Start-Process java -ArgumentList "-Xms1024M -Xmx2048M -jar paper-1.20.4.jar --nogui" -WorkingDirectory $serverDir -PassThru

# 2. Wait for port 25565 to open
Write-Host "[2/3] Waiting for Minecraft Server port 25565 to listen..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $conn = Test-NetConnection -ComputerName 127.0.0.1 -Port 25565 -InformationLevel Quiet -ErrorAction SilentlyContinue
    if ($conn) {
        $ready = $true
        break
    }
}

if ($ready) {
    Write-Host "[OK] Minecraft Server is UP and LISTENING on port 25565!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Server taking longer to start, continuing anyway..." -ForegroundColor DarkYellow
}

# 3. Start AI Agents & Mission Control Dashboard
Write-Host "[3/3] Spawning Aria, Boran, Clover & Mission Control Dashboard on port 7860..." -ForegroundColor Green
Set-Location $agentsDir
node src/index.js
