import type { Customer } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { CustomerInput } from './customer.schema';

export function toCustomerResponse(customer: Customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    created_at: customer.createdAt,
  };
}

export async function listCustomers() {
  const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });

  return customers.map(toCustomerResponse);
}

export async function createCustomer(input: CustomerInput) {
  const customer = await prisma.customer.create({ data: input });

  return toCustomerResponse(customer);
}
