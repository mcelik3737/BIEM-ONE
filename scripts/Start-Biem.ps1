$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
try {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop kurulu ve calisiyor olmali.' }
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop calismiyor. Baslatip tekrar deneyin.' }
  if (-not (Test-Path '.env.quickstart')) { & (Join-Path $PSScriptRoot 'bootstrap.ps1') }
  if (-not (Test-Path '.env.quickstart')) { throw 'Yerel ayarlar olusturulamadi.' }
  & docker compose --env-file .env.quickstart -f infrastructure/docker/compose.quickstart.yml up -d --build --wait --wait-timeout 180
  if ($LASTEXITCODE -ne 0) { throw 'Baslatma basarisiz. README icindeki log komutuyla ayrintilari inceleyin.' }
  Write-Host 'BIEM ONE hazir: http://localhost:3001'
  Start-Process 'http://localhost:3001'
} finally { Pop-Location }
