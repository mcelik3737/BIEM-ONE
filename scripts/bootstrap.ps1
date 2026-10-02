$rootEnvPath = Join-Path $PSScriptRoot '..\.env'
$rootExamplePath = Join-Path $PSScriptRoot '..\.env.example'
$apiEnvPath = Join-Path $PSScriptRoot '..\apps\api\.env'
$apiExamplePath = Join-Path $PSScriptRoot '..\apps\api\.env.example'

if (-not (Test-Path $rootEnvPath) -and (Test-Path $rootExamplePath)) {
  Copy-Item $rootExamplePath $rootEnvPath
  Write-Host 'Created .env from .env.example'
} else {
  Write-Host '.env already exists or .env.example is missing'
}

if (-not (Test-Path $apiEnvPath) -and (Test-Path $apiExamplePath)) {
  Copy-Item $apiExamplePath $apiEnvPath
  Write-Host 'Created apps/api/.env from .env.example'
} else {
  Write-Host 'apps/api/.env already exists or .env.example is missing'
}
