import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './env';

export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
