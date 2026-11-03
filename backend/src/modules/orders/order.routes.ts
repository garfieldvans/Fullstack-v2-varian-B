import type { FastifyInstance } from 'fastify';
import { parseInput, respond } from '../../shared/http';
import { createOrderSchema, orderIdParamSchema, orderListQuerySchema } from './order.schema';
import {
  cancelOrder,
  createOrder,
  getOrder,
  listOrders,
  payOrder,
} from './order.service';

export default async function orderRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const query = parseInput(orderListQuerySchema, request.query);
    const { items, total } = await listOrders(query);

    return respond(reply, items, {
      meta: { page: query.page, per_page: query.per_page, total },
    });
  });

  app.post('/', async (request, reply) => {
    const input = parseInput(createOrderSchema, request.body);
    const order = await createOrder(input);

    return respond(reply, order, { status: 201, message: 'Order berhasil dibuat' });
  });

  app.get('/:id', async (request, reply) => {
    const { id } = parseInput(orderIdParamSchema, request.params);
    const order = await getOrder(id);

    return respond(reply, order);
  });

  app.patch('/:id/pay', async (request, reply) => {
    const { id } = parseInput(orderIdParamSchema, request.params);
    const order = await payOrder(id);

    return respond(reply, order, { message: 'Order berhasil dibayar' });
  });

  app.patch('/:id/cancel', async (request, reply) => {
    const { id } = parseInput(orderIdParamSchema, request.params);
    const order = await cancelOrder(id);

    return respond(reply, order, { message: 'Order berhasil dibatalkan' });
  });
}
