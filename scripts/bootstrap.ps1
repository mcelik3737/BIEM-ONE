$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $root '.env.quickstart'
if (Test-Path $envPath) { Write-Host 'Mevcut .env.quickstart korundu.'; exit 0 }
function New-Secret {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$email = Read-Host 'Yonetici e-posta adresi'
if ($email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') { throw 'Gecerli bir e-posta adresi girin.' }
$secure = Read-Host 'Yonetici parolasi (en az 12 karakter)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
if ($password.Length -lt 12 -or $password.Contains("'") -or $password.Contains("`n") -or $password.Contains("`r")) { throw "Parola en az 12 karakter olmali; tek tirnak veya satir sonu icermemeli." }
$content = @"
DB_PASSWORD=$(New-Secret)
JWT_ACCESS_SECRET=$(New-Secret)
JWT_REFRESH_SECRET=$(New-Secret)
SEED_ADMIN_EMAIL='$email'
SEED_ADMIN_PASSWORD='$password'
APP_ORIGIN=http://localhost:3001
"@
[IO.File]::WriteAllText($envPath, $content, (New-Object Text.UTF8Encoding $false))
$password = $null
Write-Host 'Yerel ayarlar olusturuldu. Parola ekrana yazilmadi; .env.quickstart Git tarafindan yok sayilir.'
