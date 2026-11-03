import {
  Prisma,
  type Customer,
  type Order,
  type OrderItem,
  type Product,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/http';
import type { CreateOrderInput, OrderListQuery } from './order.schema';

export const MAX_QUANTITY_PER_PRODUCT = 5;
export const MAX_PENDING_ORDERS = 3;

type OrderWithCustomer = Order & { customer: Customer };
type OrderDetail = OrderWithCustomer & { items: (OrderItem & { product: Product })[] };

export function toOrderSummary(order: OrderWithCustomer & { _count: { items: number } }) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    item_count: order._count.items,
    customer: { id: order.customer.id, name: order.customer.name },
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

export function toOrderDetail(order: OrderDetail) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    item_count: order.items.length,
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
    },
    items: order.items.map((item) => ({
      id: item.id,
      product_id: item.productId,
      product_code: item.product.productCode,
      name: item.product.name,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    const customer = await lockCustomer(tx, input.customer_id);

    const pendingCount = await tx.order.count({
      where: { customerId: customer.id, status: 'PENDING' },
    });

    if (pendingCount >= MAX_PENDING_ORDERS) {
      throw new AppError(422, 'Batas order pending terlampaui', {
        customer_id: [
          `Pelanggan sudah memiliki ${MAX_PENDING_ORDERS} order PENDING, selesaikan atau batalkan salah satunya`,
        ],
      });
    }

    const quantities = collectQuantities(input.items);
    const products = await tx.product.findMany({
      where: { id: { in: [...quantities.keys()] } },
    });
    const productById = new Map(products.map((product) => [product.id, product]));

    for (const [productId, { quantity, index }] of quantities) {
      const product = productById.get(productId);

      if (!product) {
        throw productNotFound(index);
      }

      if (product.stock < quantity) {
        throw insufficientStock(product.name, product.stock, quantity, index);
      }

      const { count } = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });

      if (count === 0) {
        const latest = await tx.product.findUnique({ where: { id: productId } });

        throw insufficientStock(product.name, latest?.stock ?? 0, quantity, index);
      }
    }

    const items = input.items.map((item, index) => {
      const product = productById.get(item.product_id);

      if (!product) {
        throw productNotFound(index);
      }

      const unitPrice = new Prisma.Decimal(product.price);

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice.mul(item.quantity),
      };
    });

    const total = items.reduce(
      (sum, item) => sum.add(item.subtotal),
      new Prisma.Decimal(0),
    );

    const order = await tx.order.create({
      data: {
        orderNumber: await nextOrderNumber(tx),
        customerId: customer.id,
        total,
        items: { create: items },
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    return toOrderDetail(order);
  });
}

export async function listOrders(query: OrderListQuery) {
  const where: Prisma.OrderWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.date_from || query.date_to) {
    where.createdAt = {
      ...(query.date_from ? { gte: startOfDay(query.date_from) } : {}),
      ...(query.date_to ? { lte: endOfDay(query.date_to) } : {}),
    };
  }

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.per_page,
      take: query.per_page,
      include: { customer: true, _count: { select: { items: true } } },
    }),
  ]);

  return { items: orders.map(toOrderSummary), total };
}

export async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });

  if (!order) {
    throw new AppError(404, 'Order tidak ditemukan');
  }

  return toOrderDetail(order);
}

export async function payOrder(id: string) {
  const { count } = await prisma.order.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'PAID' },
  });

  if (count === 0) {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new AppError(404, 'Order tidak ditemukan');
    }

    throw new AppError(409, `Order berstatus ${order.status} tidak dapat dibayar`);
  }

  return getOrder(id);
}

export async function cancelOrder(id: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError(404, 'Order tidak ditemukan');
    }

    if (order.status === 'CANCELLED') {
      throw new AppError(409, 'Order sudah dibatalkan');
    }

    const { count } = await tx.order.updateMany({
      where: { id, status: order.status },
      data: { status: 'CANCELLED' },
    });

    if (count === 0) {
      throw new AppError(409, 'Status order sudah berubah, silakan muat ulang data');
    }

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });

  return getOrder(id);
}

async function lockCustomer(tx: Prisma.TransactionClient, customerId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new AppError(404, 'Pelanggan tidak ditemukan');
  }

  return rows[0];
}

async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${dateKey}-`;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${Number(dateKey)}::bigint)`;

  const count = await tx.order.count({ where: { orderNumber: { startsWith: prefix } } });

  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

function collectQuantities(items: CreateOrderInput['items']) {
  const quantities = new Map<string, { quantity: number; index: number }>();

  items.forEach((item, index) => {
    const current = quantities.get(item.product_id);
    const quantity = (current?.quantity ?? 0) + item.quantity;

    if (quantity > MAX_QUANTITY_PER_PRODUCT) {
      throw new AppError(422, 'Batas pembelian terlampaui', {
        [`items.${index}.quantity`]: [
          `Maksimal ${MAX_QUANTITY_PER_PRODUCT} unit per produk dalam satu order`,
        ],
      });
    }

    quantities.set(item.product_id, { quantity, index: current?.index ?? index });
  });

  return quantities;
}

function productNotFound(index: number) {
  return new AppError(422, 'Data tidak valid', {
    [`items.${index}.product_id`]: ['Produk tidak ditemukan'],
  });
}

function insufficientStock(name: string, stock: number, requested: number, index: number) {
  return new AppError(422, 'Stok tidak mencukupi', {
    [`items.${index}.quantity`]: [`Stok ${name} tersisa ${stock}, diminta ${requested}`],
  });
}

function startOfDay(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function endOfDay(date: string) {
  return new Date(`${date}T23:59:59.999Z`);
}
