import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError, parseInput, respond } from '../../shared/http';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const input = parseInput(loginSchema, request.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, 'Email atau password salah');
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '12h' });

    return respond(
      reply,
      {
        token,
        user: { id: user.id, name: user.name, email: user.email },
      },
      { message: 'Login berhasil' },
    );
  });
}
