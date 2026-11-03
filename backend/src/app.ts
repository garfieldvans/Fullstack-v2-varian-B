import cors from '@fastify/cors';
import Fastify from 'fastify';
import authRoutes from './modules/auth/auth.routes';
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

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({
        success: false,
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
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

  return app;
}
