# ═══════════════════════════════════════════════════════════════════════════
#  dev-web.ps1  —  Punched local web development helper
#
#  Runs the Next.js PWA on your machine with INSTATANT hot-reload (Fast
#  Refresh) while the database + API run inside Docker.
#
#  What it does:
#    1. Ensures the Docker backend (db + api) is up (starts it if not).
#    2. Stops the Dockerized `web` container so it does not occupy port 3000
#       (otherwise `npm run dev` fails with EADDRINUSE).
#    3. Starts `npm run dev` in ./punched-pwd (creating .env.local if missing).
#
#  Usage (from the repo root or anywhere):
#     powershell -ExecutionPolicy Bypass -File .\dev-web.ps1
#
#  You can override the dev port if 3000 is busy:
#     powershell -ExecutionPolicy Bypass -File .\dev-web.ps1 -Port 3001
#
#  Ctrl-C stops the dev server. To bring the Dockerized web back later:
#     docker compose --profile web up -d
# ═══════════════════════════════════════════════════════════════════════════
param(
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebDir = Join-Path $Root "punched-pwd"

Write-Host "" -ForegroundColor Cyan
Write-Host "  ██████╗ ██╗   ██╗███╗   ██╗ ██████╗██╗  ██╗███████╗██████╗ " -ForegroundColor Cyan
Write-Host "  ██╔══██╗██║   ██║████╗  ██║██╔════╝██║  ██║██╔════╝██╔══██╗" -ForegroundColor Cyan
Write-Host "  ██████╔╝██║   ██║██╔██╗ ██║██║     ███████║█████╗  ██║  ██║" -ForegroundColor Cyan
Write-Host "  ██╔═══╝ ██║   ██║██║╚██╗██║██║     ██╔══██║██╔══╝  ██║  ██║" -ForegroundColor Cyan
Write-Host "  ██║     ╚██████╔╝██║ ╚████║╚██████╗██║  ██║███████╗██████╔╝" -ForegroundColor Cyan
Write-Host "  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝ " -ForegroundColor Cyan
Write-Host "  Local web dev (hot-reload) + Dockerized backend" -ForegroundColor Cyan
Write-Host ""

# ── 1. Make sure the Docker backend (db + api) is up ─────────────────────
Write-Host "[1/3] Checking Docker backend (db + api)..." -ForegroundColor Yellow
$backendUp = (& docker compose -f (Join-Path $Root "docker-compose.yml") ps -q api 2>$null).Trim()
if (-not $backendUp) {
    Write-Host "      Starting db + api containers (this may take a moment)..." -ForegroundColor Yellow
    docker compose -f (Join-Path $Root "docker-compose.yml") up -d db api
    if ($LASTEXITCODE -ne 0) { throw "Failed to start Docker backend." }
    Write-Host "      Backend started. Waiting for API health..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
} else {
    Write-Host "      Backend already running." -ForegroundColor Green
}

# ── 2. Stop the Dockerized web so it frees the dev port ──────────────────
Write-Host "[2/3] Stopping Dockerized 'web' (frees port $Port for hot-reload)..." -ForegroundColor Yellow
& docker compose -f (Join-Path $Root "docker-compose.yml") stop web 2>&1 | Out-Null
Start-Sleep -Seconds 1

# ── 3. Ensure .env.local and start the dev server ────────────────────────
Write-Host "[3/3] Ensuring .env.local points at the Dockerized API..." -ForegroundColor Yellow
$envLocal = Join-Path $WebDir ".env.local"
if (-not (Test-Path $envLocal)) {
    Set-Content -Path $envLocal -Value @"
# Local development environment (created by dev-web.ps1).
# Points the browser at the Dockerized API.
NEXT_PUBLIC_API_URL=http://localhost:8080/v1
"@ -Encoding UTF8
    Write-Host "      Created $envLocal" -ForegroundColor Green
} else {
    Write-Host "      .env.local already exists." -ForegroundColor Green
}

Write-Host ""
Write-Host "  API:   http://localhost:8080  (Docker)" -ForegroundColor Green
Write-Host "  Web:   http://localhost:$Port  (local, hot-reload)" -ForegroundColor Green
Write-Host "  Press Ctrl-C to stop the dev server." -ForegroundColor Cyan
Write-Host ""

Push-Location $WebDir
try {
    if ($Port -eq 3000) {
        & npm run dev
    } else {
        & npm run dev -- --port $Port
    }
} finally {
    Pop-Location
}
