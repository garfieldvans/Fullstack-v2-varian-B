import type { FastifyReply } from 'fastify';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

export type PaginationMeta = {
  page: number;
  per_page: number;
  total: number;
};

type RespondOptions = {
  status?: number;
  message?: string;
  meta?: PaginationMeta;
};

export class AppError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function respond<T>(reply: FastifyReply, data: T, options: RespondOptions = {}) {
  const payload: Record<string, unknown> = {
    success: true,
    message: options.message ?? 'OK',
    data,
  };

  if (options.meta) {
    payload.meta = options.meta;
  }

  return reply.status(options.status ?? 200).send(payload);
}

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new AppError(422, 'Data tidak valid', collectIssues(result.error));
  }

  return result.data;
}

export function collectIssues(error: ZodError) {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || 'body';

    if (errors[key]) {
      errors[key].push(issue.message);
    } else {
      errors[key] = [issue.message];
    }
  }

  return errors;
}
