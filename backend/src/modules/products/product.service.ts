import { Prisma, type Product } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../shared/http';
import type { ProductInput, ProductListQuery } from './product.schema';

export function toProductResponse(product: Product) {
  return {
    id: product.id,
    product_code: product.productCode,
    name: product.name,
    price: Number(product.price),
    stock: product.stock,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

export async function listProducts(query: ProductListQuery) {
  const where: Prisma.ProductWhereInput = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { productCode: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { productCode: 'asc' },
      skip: (query.page - 1) * query.per_page,
      take: query.per_page,
    }),
  ]);

  return { items: products.map(toProductResponse), total };
}

export async function createProduct(input: ProductInput) {
  try {
    const product = await prisma.product.create({
      data: {
        productCode: input.product_code,
        name: input.name,
        price: input.price,
        stock: input.stock,
      },
    });

    return toProductResponse(product);
  } catch (err) {
    throw asProductCodeError(err);
  }
}

export async function updateProduct(id: string, input: ProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new AppError(404, 'Produk tidak ditemukan');
  }

  if (product.productCode !== input.product_code) {
    const duplicate = await prisma.product.findUnique({ where: { productCode: input.product_code } });

    if (duplicate) {
      throw duplicateProductCodeError();
    }
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        productCode: input.product_code,
        name: input.name,
        price: input.price,
        stock: input.stock,
      },
    });

    return toProductResponse(updated);
  } catch (err) {
    throw asProductCodeError(err);
  }
}

function duplicateProductCodeError() {
  return new AppError(422, 'Kode produk sudah digunakan', {
    product_code: ['Kode produk sudah digunakan'],
  });
}

function asProductCodeError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return duplicateProductCodeError();
  }

  return err;
}
