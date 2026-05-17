param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$CommandName)

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command '$CommandName' was not found in PATH."
    }
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"
$venvDir = Join-Path $backendDir ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$requirementsFile = Join-Path $backendDir "requirements.txt"

if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found at '$backendDir'."
}

if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found at '$frontendDir'."
}

if (-not (Test-Path $requirementsFile)) {
    throw "Backend requirements file not found at '$requirementsFile'."
}

Assert-Command "python"
Assert-Command "npm"
Assert-Command "npx"

if (-not (Test-Path $venvPython)) {
    Write-Host "[setup] Creating backend virtual environment..."
    & python -m venv $venvDir
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create backend virtual environment."
    }
}

if (-not $SkipInstall) {
    Write-Host "[setup] Installing backend dependencies..."
    & $venvPython -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upgrade pip in backend virtual environment."
    }

    & $venvPython -m pip install -r $requirementsFile
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install backend dependencies."
    }

    Write-Host "[setup] Installing frontend dependencies..."
    & npm --prefix $frontendDir install
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install frontend dependencies."
    }
} else {
    Write-Host "[setup] Skipping dependency installation."
}

$backendCmd = "cd /d `"$backendDir`" && `"$venvPython`" -m uvicorn app.main:app --reload --host 127.0.0.1 --port $BackendPort"
$frontendCmd = "cd /d `"$frontendDir`" && npm run dev -- --host 127.0.0.1 --port $FrontendPort"

Write-Host ""
Write-Host "Starting VissaAssist..."
Write-Host "Backend : http://127.0.0.1:$BackendPort"
Write-Host "Frontend: http://127.0.0.1:$FrontendPort"
Write-Host "Press Ctrl+C to stop both services."
Write-Host ""

& npx --yes concurrently -k -n "BACKEND,FRONTEND" -c "green,cyan" $backendCmd $frontendCmd
exit $LASTEXITCODE
