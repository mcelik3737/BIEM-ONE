import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const connection = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
assert.equal(connection.pathname, '/biem_release_test', 'Bu kontrol yalnız geçici biem_release_test veritabanında çalışır.');
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const run = (...args) => execFileSync('pnpm', ['--filter','@biem-one/api','exec','prisma',...args], {stdio:'inherit'});
try {
  const [{count}] = await db.$queryRaw`SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'`;
  assert.equal(count, 0, 'Kontrolün başlangıcında veritabanı boş olmalı; mevcut tablolar silinmez.');
  const schema = readFileSync('apps/api/prisma/schema.prisma','utf8');
  const baseline = schema.replace(/\nmodel Employee(?:Compensation|Document|TimeEntry)? \{[\s\S]*?\n\}/g,'')
    .replace(/^\s*(employees\s+Employee\[\]|employee\s+Employee\?|employeeTimeEntries\s+EmployeeTimeEntry\[\])\s*$/gm,'');
  assert.equal(/model Employee/.test(baseline),false);
  mkdirSync('.runtime',{recursive:true});
  writeFileSync('.runtime/schema-before-personnel.prisma',baseline);
  run('db','push','--schema',fileURLToPath(new URL('../.runtime/schema-before-personnel.prisma',import.meta.url)),'--skip-generate');
  const sentinel = await db.company.create({data:{name:'KABUL TESTİ ŞEMA KORUMA',slug:`schema-proof-${Date.now()}`}});
  run('db','execute','--file','prisma/upgrades/20261004_personnel.sql','--schema','prisma/schema.prisma');
  assert.equal((await db.company.findUniqueOrThrow({where:{id:sentinel.id}})).name,sentinel.name);
  run('migrate','diff','--from-url',process.env.DATABASE_URL,'--to-schema-datamodel','prisma/schema.prisma','--exit-code');
  console.log('PASS Personel şema yükseltmesi: önceki şema ve örnek kayıt korundu; yeni şema birebir doğrulandı.');
} finally {await db.$disconnect();}
