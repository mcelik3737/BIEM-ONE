$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
node scripts/start.mjs
if ($LASTEXITCODE -ne 0) { throw 'BIEM ONE başlatılamadı. Yukarıdaki engeli giderin.' }
