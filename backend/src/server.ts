import 'dotenv/config';
import { buildApp } from './app';

const port = Number(process.env.PORT ?? 3001);

async function main() {
  const app = await buildApp();
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});