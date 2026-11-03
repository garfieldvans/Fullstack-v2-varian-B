import cors from '@fastify/cors';
import Fastify from 'fastify';

type BuildOptions = {
  logger?: boolean;
};

export async function buildApp(options: BuildOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
    ajv: { customOptions: { allErrors: true } },
  });

  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}