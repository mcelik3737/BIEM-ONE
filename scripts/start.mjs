import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
if (!existsSync('.env')) throw new Error('.env bulunamadı. .env.example dosyasından yerel ayarlarınızı oluşturun. Şifreleri Git içine eklemeyin.');
process.loadEnvFile('.env');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env: process.env, stdio: 'inherit', shell: process.platform === 'win32' && command.endsWith('.cmd'), windowsHide: true, ...options });
  if (result.status !== 0) throw new Error(`${command} işlemi başarısız. Ayrıntı yukarıdaki çıktıda.`);
  return result;
}
const compose = ['compose', '-p', 'docker', '--env-file', resolve('.env'), '-f', resolve('infrastructure/docker/docker-compose.yml')];
run('docker', [...compose, 'up', '-d', '--wait', 'postgres', 'redis']);
run(pnpm, ['install', '--frozen-lockfile']);
run(pnpm, ['--filter', '@biem-one/api', 'exec', 'prisma', 'generate']);
const tables = run('docker', ['exec', 'biem-one-postgres', 'psql', '-U', process.env.POSTGRES_USER || 'biem_user', '-d', process.env.POSTGRES_DB || 'biem_one', '-tAc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
if (Number(tables.stdout.trim()) === 0) {
  run(pnpm, ['--filter', '@biem-one/api', 'exec', 'prisma', 'db', 'push']);
  run(pnpm, ['--filter', '@biem-one/api', 'exec', 'prisma', 'db', 'seed']);
} else {
  // Read-only comparison: never apply a schema automatically to an existing database.
  run(pnpm, ['--filter', '@biem-one/api', 'exec', 'prisma', 'migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code']);
}
run('docker', [...compose, 'up', '-d', '--build', '--no-deps', 'api']);
async function healthy(url) { try { return (await fetch(url, { signal: AbortSignal.timeout(2500) })).ok; } catch { return false; } }
async function waitFor(url) { for (let i = 0; i < 90; i++) { if (await healthy(url)) return; await new Promise(r => setTimeout(r, 1000)); } throw new Error(`Servis hazır değil: ${url}. .runtime loglarını kontrol edin.`); }
await waitFor('http://localhost:3000/api/v1/health');
const nextPath = resolve('apps/admin/node_modules/next/dist/bin/next');
const digest = createHash('sha256');
function hashSources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (['node_modules', '.next', '.turbo', 'tsconfig.tsbuildinfo', 'next-env.d.ts'].includes(entry.name)) continue;
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) hashSources(path);
    else digest.update(path).update(readFileSync(path));
  }
}
hashSources(resolve('apps/admin'));
digest.update(readFileSync('pnpm-lock.yaml'));
const fingerprint = digest.digest('hex');
const statePath = '.runtime/admin-process.json';
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null;
let running = await healthy('http://localhost:3001/login');
if (running && state?.fingerprint !== fingerprint) {
  if (process.platform !== 'win32' || state?.root !== root || !Number.isSafeInteger(state?.pid)) throw new Error('3001 portunda başka bir servis var. Mevcut servisi inceleyin.');
  const processInfo = spawnSync('powershell.exe', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${state.pid}").CommandLine`], { encoding: 'utf8', windowsHide: true });
  if (!processInfo.stdout.includes(nextPath)) throw new Error('3001 portundaki süreç BIEM ONE başlatıcısına ait değil.');
  process.kill(state.pid);
  await new Promise(resolve => setTimeout(resolve, 1500));
  running = false;
}
if (!running) {
  run(pnpm, ['--filter', '@biem-one/admin', 'build']);
  mkdirSync('.runtime', { recursive: true });
  const out = openSync('.runtime/admin.log', 'a');
  const child = spawn(process.execPath, [resolve('apps/admin/node_modules/next/dist/bin/next'), 'start', '--port', '3001', '--hostname', '127.0.0.1'], { cwd: resolve('apps/admin'), detached: true, windowsHide: true, stdio: ['ignore', out, out], env: process.env });
  child.unref();
  writeFileSync('.runtime/admin-process.json', JSON.stringify({ pid: child.pid, root, fingerprint }));
}
await waitFor('http://localhost:3001/login');
console.log('BIEM ONE hazır: http://localhost:3001 — yerel .env içindeki SEED_ADMIN_EMAIL hesabıyla giriş yapın.');
