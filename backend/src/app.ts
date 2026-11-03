import cors from '@fastify/cors';
import Fastify, { type FastifyError } from 'fastify';
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customers/customer.routes';
import orderRoutes from './modules/orders/order.routes';
import productRoutes from './modules/products/product.routes';
import authPlugin from './plugins/auth';
import { AppError } from './shared/http';

type BuildOptions = {
  logger?: boolean;
};

export async function buildApp(options: BuildOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  await app.register(cors, { origin: true });
  await app.register(authPlugin);

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      success: false,
      message: `Endpoint ${request.method} ${request.url} tidak ditemukan`,
    }),
  );

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({
        success: false,
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      success: false,
      message: 'Terjadi kesalahan pada server',
    });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/api' });

  await app.register(async (api) => {
    api.addHook('preHandler', api.authenticate);

    await api.register(productRoutes, { prefix: '/api/products' });
    await api.register(customerRoutes, { prefix: '/api/customers' });
    await api.register(orderRoutes, { prefix: '/api/orders' });
  });

  return app;
}
