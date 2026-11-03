export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/orders_test?schema=public';

export const TEST_JWT_SECRET = 'test-secret';
