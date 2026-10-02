$ErrorActionPreference = 'SilentlyContinue'

function Write-Check {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Details = ''
  )

  $status = if ($Ok) { 'OK' } else { 'MISSING' }
  if ($Details) {
    Write-Host ("[{0}] {1} - {2}" -f $status, $Name, $Details)
  } else {
    Write-Host ("[{0}] {1}" -f $status, $Name)
  }
}

function Get-CommandPath {
  param([string]$Command)

  $resolved = Get-Command $Command -ErrorAction SilentlyContinue
  if ($resolved) {
    return $resolved.Source
  }

  return $null
}

function Get-FirstOutputLine {
  param([scriptblock]$Command)

  try {
    $output = & $Command 2>&1 | Select-Object -First 1
    if ($output) {
      return ($output | Out-String).Trim()
    }
  } catch {
    return $null
  }

  return $null
}

function Test-Port {
  param([int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
  if ($connections) {
    $states = ($connections | Select-Object -ExpandProperty State -Unique) -join ','
    Write-Check "Port $Port" $true "in use ($states)"
  } else {
    Write-Check "Port $Port" $true 'available'
  }
}

Write-Host 'BIEM ONE Development Doctor'
Write-Host 'This script only diagnoses local prerequisites.'
Write-Host ''

$git = Get-CommandPath 'git'
Write-Check 'Git' ([bool]$git) $(if ($git) { Get-FirstOutputLine { git --version } })

$node = Get-CommandPath 'node'
Write-Check 'Node.js' ([bool]$node) $(if ($node) { Get-FirstOutputLine { node --version } })

$pnpm = Get-CommandPath 'pnpm'
Write-Check 'pnpm' ([bool]$pnpm) $(if ($pnpm) { Get-FirstOutputLine { pnpm --version } })

$docker = Get-CommandPath 'docker'
Write-Check 'Docker' ([bool]$docker) $(if ($docker) { Get-FirstOutputLine { docker --version } })

$dockerCompose = $false
$dockerComposeVersion = $null
if ($docker) {
  $dockerComposeVersion = Get-FirstOutputLine { docker compose version }
  $dockerCompose = [bool]$dockerComposeVersion
}
Write-Check 'Docker Compose' $dockerCompose $dockerComposeVersion

$flutter = Get-CommandPath 'flutter'
Write-Check 'Flutter' ([bool]$flutter) $(if ($flutter) { Get-FirstOutputLine { flutter --version } })

$java = Get-CommandPath 'java'
Write-Check 'Java' ([bool]$java) $(if ($java) { Get-FirstOutputLine { java -version } })

$androidHome = $env:ANDROID_HOME
$androidSdkRoot = $env:ANDROID_SDK_ROOT
$androidSdkPath = if ($androidHome) { $androidHome } elseif ($androidSdkRoot) { $androidSdkRoot } else { $null }
$androidSdkExists = $androidSdkPath -and (Test-Path $androidSdkPath)
Write-Check 'Android SDK' ([bool]$androidSdkExists) $(if ($androidSdkPath) { $androidSdkPath } else { 'ANDROID_HOME or ANDROID_SDK_ROOT not set' })

Write-Host ''
Write-Host 'Required local ports'
Test-Port 3000
Test-Port 3001
Test-Port 5433
Test-Port 6379

Write-Host ''
Write-Host 'Project files'
Write-Check '.env ignored by Git' ((git check-ignore .env 2>$null) -ne $null)
Write-Check 'apps/api/.env ignored by Git' ((git check-ignore apps/api/.env 2>$null) -ne $null)
Write-Check 'Docker Compose file' (Test-Path 'infrastructure/docker/docker-compose.yml')
Write-Check 'Flutter pubspec' (Test-Path 'apps/mobile/pubspec.yaml')
