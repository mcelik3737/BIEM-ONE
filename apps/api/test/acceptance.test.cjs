const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { hash } = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');

if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.endsWith('_test'))
  throw new Error('Use a disposable database ending in _test.');
process.env.JWT_ACCESS_SECRET = randomBytes(32).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(32).toString('hex');
const { AppModule } = require('../dist/app.module');
const db = new PrismaClient();
const password = randomBytes(20).toString('hex');
let app, base, admin, other, manager, field, userId;
async function request(path, token, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  return { status: r.status, data };
}
async function good(path, token, body, method) {
  const r = await request(path, token, body, method);
  assert.ok(r.status < 300, `${path}: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}
async function makeUser(companyId, code) {
  const role = await db.role.upsert({ where: { code }, create: { code, name: code }, update: {} });
  const user = await db.user.create({
    data: {
      companyId,
      email: `${randomUUID()}@example.test`,
      fullName: 'Acceptance',
      passwordHash: await hash(password, 4),
      roles: { create: { roleId: role.id } },
    },
  });
  const session = await good('/auth/login', null, { email: user.email, password });
  return { ...session, id: user.id };
}
before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  await app.listen(0, '127.0.0.1');
  base = `${await app.getUrl()}/api/v1`;
  const a = await db.company.create({ data: { name: 'Acceptance A', slug: randomUUID() } });
  const b = await db.company.create({ data: { name: 'Acceptance B', slug: randomUUID() } });
  const u = await makeUser(a.id, 'COMPANY_ADMIN');
  admin = u.tokens.accessToken;
  userId = u.id;
  other = (await makeUser(b.id, 'SUPER_ADMIN')).tokens.accessToken;
  manager = (await makeUser(a.id, 'PROJECT_MANAGER')).tokens.accessToken;
  field = (await makeUser(a.id, 'FIELD_ENGINEER')).tokens.accessToken;
});
after(async () => {
  if (app) await app.close();
  await db.$disconnect();
});

test('usable core: real HTTP + PostgreSQL acceptance', async (t) => {
  let customer, supplier, project, operation, bom, order;
  await t.test(
    'login rejects invalid credentials; protected routes require authentication',
    async () => {
      assert.equal(
        (
          await request('/auth/login', null, {
            email: 'invalid@example.test',
            password: 'invalid-password',
          })
        ).status,
        401,
      );
      assert.equal((await request('/customers')).status, 401);
    },
  );
  await t.test('customer and supplier CRUD, search, active toggle, field RBAC', async () => {
    customer = await good('/customers', admin, {
      name: 'Kabul Müşteri',
      contactName: 'Ayşe',
      email: 'contact@example.test',
    });
    supplier = await good('/suppliers', admin, { name: 'Kabul Tedarikçi' });
    await good(
      `/customers/${customer.id}`,
      admin,
      { shortName: 'Kabul', isActive: false },
      'PATCH',
    );
    assert.equal((await good('/customers?q=Kabul', admin))[0].isActive, false);
    assert.equal(
      (await request('/projects', admin, { name: 'Pasif test', customerId: customer.id })).status,
      400,
    );
    await good(`/customers/${customer.id}`, admin, { isActive: true }, 'PATCH');
    assert.equal((await request('/customers', field, { name: 'Yetkisiz' })).status, 403);
  });
  await t.test(
    'foreign IDs and lists never expose another company, including super admin',
    async () => {
      assert.deepEqual(await good('/customers', other), []);
      assert.deepEqual(await good('/suppliers', other), []);
      assert.equal(
        (await request(`/customers/${customer.id}`, other, { name: 'Çalınan kayıt' }, 'PATCH'))
          .status,
        404,
      );
      assert.equal(
        (await request('/projects', other, { name: 'İhlal denemesi', customerId: customer.id }))
          .status,
        400,
      );
      for (const path of ['users', 'contacts', 'tasks', 'files', 'audit-logs', 'timeline-events']) {
        const data = await good(`/${path}`, other);
        if (path === 'users')
          assert.ok(data.every((u) => u.companyId !== customer.companyId && !u.passwordHash));
        else assert.deepEqual(data, []);
      }
    },
  );
  await t.test('one Project → one Operation; winning is retry safe', async () => {
    project = await good('/projects', admin, { name: 'TETRA saha işi', customerId: customer.id });
    for (const status of ['SURVEY', 'QUOTED', 'DECISION', 'WON', 'WON'])
      await good(`/projects/${project.id}/sales-status`, admin, { status }, 'PATCH');
    const saved = await good(`/projects/${project.id}`, admin);
    operation = saved.operation;
    assert.equal(await db.projectOperation.count({ where: { projectId: project.id } }), 1);
    assert.equal((await good('/projects', admin)).length, 1);
    assert.equal((await request(`/projects/${project.id}`, other)).status, 404);
    assert.equal(
      (await request(`/projects/${project.id}/sales-status`, admin, { status: 'LOST' }, 'PATCH'))
        .status,
      409,
    );
  });
  await t.test(
    'decimal BOM persists; zero, negative, excess precision, and other tenant blocked',
    async () => {
      const item = {
        name: 'RF kablo',
        unit: 'm',
        quantity: '100',
        unitPrice: '10',
        currency: 'USD',
      };
      bom = await good(`/operations/${operation.id}/bom`, admin, item);
      for (const quantity of ['0', '-1', '1.00001', 'NaN'])
        assert.equal(
          (await request(`/operations/${operation.id}/bom`, admin, { ...item, quantity })).status,
          400,
        );
      assert.equal((await request(`/operations/${operation.id}/bom`, other, item)).status, 404);
      const decimal = await good(`/operations/${operation.id}/bom`, admin, {
        ...item,
        name: 'Ondalık test',
        quantity: '0.125',
        unitPrice: '1.2356',
      });
      assert.equal(decimal.quantity, '0.125');
      assert.equal(decimal.unitPrice, '1.2356');
      await good(`/operations/${operation.id}/bom/${decimal.id}`, admin, undefined, 'DELETE');
    },
  );
  await t.test('100m × $10 = $1000, 20% tax = $1200; order creation idempotent', async () => {
    const body = {
      supplierId: supplier.id,
      requestKey: randomUUID(),
      currency: 'USD',
      items: [{ bomItemId: bom.id, quantity: '100', unitPrice: '10', taxRate: '20' }],
    };
    order = await good(`/operations/${operation.id}/purchase-orders`, manager, body);
    assert.equal(order.subtotal, '1000');
    assert.equal(order.taxTotal, '200');
    assert.equal(order.total, '1200');
    assert.equal(
      (await good(`/operations/${operation.id}/purchase-orders`, manager, body)).id,
      order.id,
    );
    assert.equal(
      (
        await request(`/operations/${operation.id}/purchase-orders`, manager, {
          ...body,
          requestKey: randomUUID(),
        })
      ).status,
      409,
    );
    assert.equal(
      (await request(`/operations/${operation.id}/bom/${bom.id}`, admin, undefined, 'DELETE'))
        .status,
      409,
    );
    assert.equal(
      (
        await request(
          `/operations/${operation.id}/bom/${bom.id}`,
          admin,
          { name: 'Changed', unit: 'm', quantity: '100', unitPrice: '11', currency: 'USD' },
          'PATCH',
        )
      ).status,
      409,
    );
  });
  await t.test('approval RBAC and order transition enforcement', async () => {
    assert.equal(
      (await request(`/purchase-orders/${order.id}/status`, admin, { status: 'ORDERED' }, 'PATCH'))
        .status,
      409,
    );
    await good(`/purchase-orders/${order.id}/status`, manager, { status: 'SUBMITTED' }, 'PATCH');
    assert.equal(
      (
        await request(
          `/purchase-orders/${order.id}/status`,
          manager,
          { status: 'APPROVED' },
          'PATCH',
        )
      ).status,
      403,
    );
    assert.equal(
      (await request(`/purchase-orders/${order.id}/status`, other, { status: 'APPROVED' }, 'PATCH'))
        .status,
      404,
    );
    await good(`/purchase-orders/${order.id}/status`, admin, { status: 'APPROVED' }, 'PATCH');
    await good(`/purchase-orders/${order.id}/status`, manager, { status: 'ORDERED' }, 'PATCH');
  });
  await t.test(
    'partial 40 + final 60 receipt; replay safe; excess and cancellation rejected',
    async () => {
      const body = {
        requestKey: randomUUID(),
        items: [{ itemId: order.items[0].id, quantity: '40' }],
      };
      await good(`/purchase-orders/${order.id}/receipts`, field, body);
      await good(`/purchase-orders/${order.id}/receipts`, field, body);
      let saved = await db.purchaseOrder.findUnique({
        where: { id: order.id },
        include: { items: true, receipts: true },
      });
      assert.equal(saved.status, 'PARTIALLY_RECEIVED');
      assert.equal(saved.items[0].receivedQuantity.toString(), '40');
      assert.equal(saved.receipts.length, 1);
      assert.equal(
        (
          await request(`/purchase-orders/${order.id}/receipts`, field, {
            ...body,
            requestKey: randomUUID(),
            items: [{ itemId: order.items[0].id, quantity: '61' }],
          })
        ).status,
        409,
      );
      await good(`/purchase-orders/${order.id}/receipts`, field, {
        ...body,
        requestKey: randomUUID(),
        items: [{ itemId: order.items[0].id, quantity: '60' }],
      });
      saved = await db.purchaseOrder.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      assert.equal(saved.status, 'RECEIVED');
      assert.equal(saved.items[0].receivedQuantity.toString(), '100');
      assert.equal(
        (
          await request(`/purchase-orders/${order.id}/receipts`, field, {
            ...body,
            requestKey: randomUUID(),
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request(
            `/purchase-orders/${order.id}/status`,
            admin,
            { status: 'CANCELLED' },
            'PATCH',
          )
        ).status,
        409,
      );
    },
  );
  await t.test('concurrent receipts never overrun quantity, one request rolls back', async () => {
    const second = await good(`/operations/${operation.id}/bom`, admin, {
      name: 'Fiber kablo',
      unit: 'm',
      quantity: '100',
      unitPrice: '2.5',
      currency: 'EUR',
    });
    const po = await good(`/operations/${operation.id}/purchase-orders`, admin, {
      supplierId: supplier.id,
      requestKey: randomUUID(),
      currency: 'EUR',
      items: [{ bomItemId: second.id, quantity: '100', unitPrice: '2.5', taxRate: '20' }],
    });
    for (const status of ['SUBMITTED', 'APPROVED', 'ORDERED'])
      await good(`/purchase-orders/${po.id}/status`, admin, { status }, 'PATCH');
    const results = await Promise.all(
      [1, 2].map(() =>
        request(`/purchase-orders/${po.id}/receipts`, field, {
          requestKey: randomUUID(),
          items: [{ itemId: po.items[0].id, quantity: '60' }],
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    const line = await db.purchaseOrderItem.findUnique({ where: { id: po.items[0].id } });
    assert.equal(line.receivedQuantity.toString(), '60');
  });
  await t.test('cancellation preserves order and frees reserved BOM quantities', async () => {
    const item = await good(`/operations/${operation.id}/bom`, admin, {
      name: 'Konnektör',
      unit: 'adet',
      quantity: '2.5',
      unitPrice: '0.1',
      currency: 'USD',
    });
    const body = {
      supplierId: supplier.id,
      requestKey: randomUUID(),
      currency: 'USD',
      items: [{ bomItemId: item.id, quantity: '2.5', unitPrice: '0.1', taxRate: '20' }],
    };
    const po = await good(`/operations/${operation.id}/purchase-orders`, admin, body);
    assert.equal(po.total, '0.3');
    await good(`/purchase-orders/${po.id}/status`, admin, { status: 'CANCELLED' }, 'PATCH');
    assert.equal((await db.purchaseOrder.findUnique({ where: { id: po.id } })).status, 'CANCELLED');
    assert.equal(
      (await request(`/operations/${operation.id}/bom/${item.id}`, admin, undefined, 'DELETE'))
        .status,
      409,
    );
    const replacement = await good(`/operations/${operation.id}/purchase-orders`, admin, {
      ...body,
      requestKey: randomUUID(),
    });
    assert.notEqual(replacement.number, po.number);
  });
  await t.test('refresh rotation, revocation, and inactive user enforcement', async () => {
    const user = await db.user.findUnique({ where: { id: userId } });
    const session = await good('/auth/login', null, { email: user.email, password });
    const rotated = await good('/auth/refresh', null, {
      refreshToken: session.tokens.refreshToken,
    });
    assert.notEqual(rotated.tokens.refreshToken, session.tokens.refreshToken);
    assert.equal(
      (await request('/auth/refresh', null, { refreshToken: session.tokens.refreshToken })).status,
      401,
    );
    await good('/auth/logout', null, { refreshToken: rotated.tokens.refreshToken });
    assert.equal(
      (await request('/auth/refresh', null, { refreshToken: rotated.tokens.refreshToken })).status,
      401,
    );
    await db.user.update({ where: { id: userId }, data: { isActive: false } });
    assert.equal((await request('/auth/me', admin)).status, 401);
    assert.equal((await request('/auth/login', null, { email: user.email, password })).status, 401);
  });
});
