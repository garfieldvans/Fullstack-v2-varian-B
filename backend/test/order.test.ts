import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

let app: FastifyInstance;
let token: string;
let customerId: string;
let productId: string;

const passwordHash = bcrypt.hashSync('secret123', 4);

function auth() {
  return { authorization: `Bearer ${token}` };
}

function createOrder(quantity: number) {
  return app.inject({
    method: 'POST',
    url: '/api/orders',
    headers: auth(),
    payload: {
      customer_id: customerId,
      items: [{ product_id: productId, quantity }],
    },
  });
}

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { email: 'admin@test.dev', name: 'Admin', passwordHash },
  });

  token = app.jwt.sign({ sub: user.id, email: user.email });

  const customer = await prisma.customer.create({
    data: { name: 'Andi Pratama', email: 'andi@test.dev' },
  });

  const product = await prisma.product.create({
    data: { productCode: 'PRD-001', name: 'Hydrococo 150ml', price: 8000, stock: 10 },
  });

  customerId = customer.id;
  productId = product.id;
});

describe('POST /api/orders', () => {
  it('membuat order dan mengurangi stok produk', async () => {
    const response = await createOrder(2);
    const body = response.json();

    expect(response.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PENDING');
    expect(body.data.order_number).toMatch(/^INV-\d{8}-\d{4}$/);
    expect(body.data.total).toBe(16000);
    expect(body.data.items[0].unit_price).toBe(8000);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(8);
  });

  it('menolak order saat stok tidak cukup tanpa mengubah stok', async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 3 } });

    const response = await createOrder(4);
    const body = response.json();

    expect(response.statusCode).toBe(422);
    expect(body.message).toBe('Stok tidak mencukupi');
    expect(body.errors['items.0.quantity']).toEqual(['Stok Hydrococo 150ml tersisa 3, diminta 4']);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(3);
    expect(await prisma.order.count()).toBe(0);
  });

  it('tidak membuat stok minus saat dua order masuk bersamaan', async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 1 } });

    const responses = await Promise.all([createOrder(1), createOrder(1)]);
    const statuses = responses.map((response) => response.statusCode).sort();

    expect(statuses).toEqual([201, 422]);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(0);
  });

  it('menolak lebih dari 5 unit produk yang sama dalam satu order', async () => {
    const response = await createOrder(6);
    const body = response.json();

    expect(response.statusCode).toBe(422);
    expect(body.errors['items.0.quantity']).toEqual([
      'Maksimal 5 unit per produk dalam satu order',
    ]);
  });

  it('menolak order PENDING keempat untuk pelanggan yang sama', async () => {
    for (let index = 0; index < 3; index += 1) {
      const response = await createOrder(1);
      expect(response.statusCode).toBe(201);
    }

    const response = await createOrder(1);
    const body = response.json();

    expect(response.statusCode).toBe(422);
    expect(body.errors.customer_id).toHaveLength(1);
    expect(await prisma.order.count()).toBe(3);
  });
});

describe('PATCH /api/orders/:id', () => {
  it('mengembalikan stok saat order dibatalkan', async () => {
    const created = await createOrder(2);
    const orderId = created.json().data.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/orders/${orderId}/cancel`,
      headers: auth(),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('CANCELLED');

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stock).toBe(10);
  });

  it('menolak transisi status yang tidak valid', async () => {
    const created = await createOrder(1);
    const orderId = created.json().data.id;

    const pay = await app.inject({
      method: 'PATCH',
      url: `/api/orders/${orderId}/pay`,
      headers: auth(),
    });

    expect(pay.statusCode).toBe(200);
    expect(pay.json().data.status).toBe('PAID');

    const payAgain = await app.inject({
      method: 'PATCH',
      url: `/api/orders/${orderId}/pay`,
      headers: auth(),
    });

    expect(payAgain.statusCode).toBe(409);

    const cancel = await app.inject({
      method: 'PATCH',
      url: `/api/orders/${orderId}/cancel`,
      headers: auth(),
    });

    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().data.status).toBe('CANCELLED');

    const cancelAgain = await app.inject({
      method: 'PATCH',
      url: `/api/orders/${orderId}/cancel`,
      headers: auth(),
    });

    expect(cancelAgain.statusCode).toBe(409);
  });
});

describe('akses tanpa token', () => {
  it('menolak permintaan tanpa header authorization', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/orders' });

    expect(response.statusCode).toBe(401);
    expect(response.json().success).toBe(false);
  });
});
