import type { FastifyInstance } from 'fastify';
import { parseInput, respond } from '../../shared/http';
import { idParamSchema, productListQuerySchema, productSchema } from './product.schema';
import { createProduct, listProducts, updateProduct } from './product.service';

export default async function productRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const query = parseInput(productListQuerySchema, request.query);
    const { items, total } = await listProducts(query);

    return respond(reply, items, {
      meta: { page: query.page, per_page: query.per_page, total },
    });
  });

  app.post('/', async (request, reply) => {
    const input = parseInput(productSchema, request.body);
    const product = await createProduct(input);

    return respond(reply, product, { status: 201, message: 'Produk berhasil dibuat' });
  });

  app.put('/:id', async (request, reply) => {
    const { id } = parseInput(idParamSchema, request.params);
    const input = parseInput(productSchema, request.body);
    const product = await updateProduct(id, input);

    return respond(reply, product, { message: 'Produk berhasil diperbarui' });
  });
}
