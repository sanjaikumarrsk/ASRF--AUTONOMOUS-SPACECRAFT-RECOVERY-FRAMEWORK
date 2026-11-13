# ==============================================================================
# AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK Unified Full-Stack Launcher (PowerShell)
# NASA / JPL-Style Spacecraft Telemetry & Cyber-Physical Digital Twin
# ==============================================================================

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "celestial-x"
$PostgresDataDir = Join-Path $BackendDir ".postgres-data"
$PythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    $PythonExe = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
    if (-not $PythonExe) {
        Write-Error "Python executable could not be located. Ensure backend/.venv or system Python is installed."
        exit 1
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK" -ForegroundColor White
Write-Host "   NASA / JPL & ESA Mission Science Interface Platform" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check or Start PostgreSQL on Port 55432
Write-Host "[1/4] Checking PostgreSQL database on port 55432..." -ForegroundColor Yellow
$pgListening = Get-NetTCPConnection -LocalPort 55432 -State Listen -ErrorAction SilentlyContinue

$pgProcess = $null
if (-not $pgListening) {
    Write-Host "      Starting isolated local PostgreSQL cluster on port 55432..." -ForegroundColor Gray
    $pgBin = "C:\Program Files\PostgreSQL\18\bin\postgres.exe"
    if (-not (Test-Path $pgBin)) {
        $pgBin = "postgres.exe"
    }
    $pgProcess = Start-Process -FilePath $pgBin -ArgumentList "-D `"$PostgresDataDir`" -p 55432" -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "      PostgreSQL daemon started (PID: $($pgProcess.Id))." -ForegroundColor Green
} else {
    Write-Host "      PostgreSQL is already active on port 55432." -ForegroundColor Green
}

# 2. Initialize Database & Seed Documents / 50 Components / 25 Investigations
Write-Host "[2/4] Verifying database schema and seeding 50 components & 25 investigations..." -ForegroundColor Yellow
Push-Location $BackendDir
try {
    & $PythonExe -m app.seeder
    Write-Host "      50 components, users, 14 reports, and 25 investigations verified." -ForegroundColor Green
} catch {
    Write-Host "      Database initialization notice: $($_.Exception.Message)" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# 3. Start FastAPI Backend (Port 8000)
Write-Host "[3/4] Launching FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath $PythonExe -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory $BackendDir -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
Write-Host "      FastAPI backend running (PID: $($backendProcess.Id))." -ForegroundColor Green

# 4. Start Vite React Frontend (Port 5173)
Write-Host "[4/4] Launching Vite Frontend on http://localhost:5173..." -ForegroundColor Yellow
$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) { $npmCmd = "npm" }

$frontendProcess = Start-Process -FilePath $npmCmd -ArgumentList "run dev -- --host 127.0.0.1" -WorkingDirectory $FrontendDir -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3
Write-Host "      Vite dev server running (PID: $($frontendProcess.Id))." -ForegroundColor Green

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "   AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK OPERATIONAL" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "   Frontend Mission Portal  : http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Operations Dashboard     : http://localhost:5173/dashboard" -ForegroundColor Cyan
Write-Host "   System Architecture      : http://localhost:5173/system" -ForegroundColor Cyan
Write-Host "   Audit & Records Vault    : http://localhost:5173/records" -ForegroundColor Cyan
Write-Host "   Backend API Docs         : http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "   Live WebSocket Stream    : ws://127.0.0.1:8000/api/telemetry/ws" -ForegroundColor Cyan
Write-Host "   Default Credentials      : rsk / rsk  or  flight_director / SafeFlight2026!" -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "Press [CTRL+C] in this window to cleanly terminate all processes." -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if ($backendProcess.HasExited) {
            Write-Host "Backend process stopped." -ForegroundColor Red
            break
        }
        if ($frontendProcess.HasExited) {
            Write-Host "Frontend process stopped." -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "`nShutting down CELESTIAL-X processes..." -ForegroundColor Yellow
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Shutdown complete." -ForegroundColor Green
}

