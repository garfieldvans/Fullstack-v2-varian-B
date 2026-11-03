import type { FastifyInstance } from 'fastify';
import { parseInput, respond } from '../../shared/http';
import { customerSchema } from './customer.schema';
import { createCustomer, listCustomers } from './customer.service';

export default async function customerRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    const customers = await listCustomers();

    return respond(reply, customers);
  });

  app.post('/', async (request, reply) => {
    const input = parseInput(customerSchema, request.body);
    const customer = await createCustomer(input);

    return respond(reply, customer, { status: 201, message: 'Pelanggan berhasil dibuat' });
  });
}
