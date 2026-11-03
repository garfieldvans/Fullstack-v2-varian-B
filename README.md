# Order App

Order App is a small inventory and order-management application built as two separate services: a Next.js web client and a Fastify REST API backed by PostgreSQL. It demonstrates authenticated product and customer access, transactional order creation, inventory handling, and order status changes.

The implemented business rules are **Variant B (purchase limits)**: no more than 5 units of a product in one order and no more than 3 pending orders per customer.

## Features

- JWT login for the seeded administrator; API routes other than login require a bearer token.
- Product listing with pagination and case-insensitive search by product name or code; the API also supports product creation and updates.
- Customer listing and creation through the API.
- Order creation with server-calculated prices and totals, stock checks, and transactional rollback on failure.
- Per-product quantity and per-customer pending-order limits.
- Order history with status and date filters, order details, payment, and cancellation with inventory restoration.
- Web screens for login, product browsing, order creation, order history, and order details.
- Automated API tests for order creation, inventory concurrency, purchase limits, status transitions, cancellation, and authentication.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Backend | TypeScript, Fastify 5, Zod 4, Prisma 6, `@fastify/jwt`, `@fastify/cors`, bcryptjs |
| Database | PostgreSQL; Prisma schema and migrations |
| Backend testing | Vitest 5, Fastify injection |
| Frontend | TypeScript, Next.js 16 App Router, React 19, Tailwind CSS 4 |
| Runtime and tooling | Node.js, npm, tsx, Docker (for local PostgreSQL) |

## Project Structure

```text
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/             # Database migration history
│   │   ├── schema.prisma           # PostgreSQL models and relations
│   │   └── seed.ts                 # Development admin, products, and customers
│   ├── src/
│   │   ├── app.ts                  # Fastify setup, error handling, and route registration
│   │   ├── server.ts               # HTTP server entry point
│   │   ├── lib/prisma.ts           # Prisma client
│   │   ├── plugins/auth.ts         # JWT setup and request authentication
│   │   ├── modules/                # Auth, products, customers, and orders
│   │   └── shared/http.ts          # Response envelope and input validation helpers
│   ├── test/                       # Vitest setup and order API tests
│   ├── .env.example                # Backend environment template
│   ├── package.json                # Backend scripts and dependencies
│   └── vitest.config.mts           # Test configuration
├── frontend/
│   ├── src/app/                    # App Router pages and dashboard layout
│   ├── src/lib/api.ts              # API client, token storage, and error handling
│   ├── src/lib/format.ts           # Display formatting helpers
│   ├── src/lib/types.ts            # Frontend API/domain types
│   ├── .env.example                # Frontend environment template
│   └── package.json                # Frontend scripts and dependencies
└── README.md
```

## Architecture

The frontend and backend are independent Node.js applications. The browser sends requests to the backend under `/api`; the backend validates input with Zod, applies business rules in module services, and reads or writes PostgreSQL through Prisma. Successful responses use a `{ success, message, data }` envelope, with pagination metadata where applicable. Validation and business-rule errors include a message and, when available, field-keyed `errors`.

The `/api/login` endpoint is public. Other `/api/products`, `/api/customers`, and `/api/orders` routes are registered behind a JWT authentication hook. The frontend keeps the token in browser `localStorage` and sends it as `Authorization: Bearer <token>`.

### Order creation flow

`POST /api/orders` is validated by `order.schema.ts` and handled by `createOrder()` in `order.service.ts` inside a Prisma transaction. It locks the customer row to serialize checks of that customer's pending-order limit, aggregates repeated product lines to enforce the 5-unit limit, and decrements stock with a conditional database update (`stock >= requested quantity`). A failed item throws an error and rolls back all transaction changes. Prices are read from the database, and the server calculates item subtotals and the order total. An advisory transaction lock serializes daily order-number generation in the `INV-YYYYMMDD-XXXX` format before the order and its items are saved.

## Prerequisites

- Node.js 20 or newer and npm.
- Docker, to run PostgreSQL locally, or an available PostgreSQL instance.

## Installation and Setup

Run the setup commands from the repository root. Start the backend and frontend in separate terminals, also from the repository root.

```bash
git clone <repository-url> && cd <repository-directory>
docker run -d --name orders-db -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=orders_dev postgres:17-alpine
(cd backend && cp .env.example .env && npm install && npm run db:migrate && npm run db:seed)
(cd frontend && cp .env.example .env.local && npm install)
(cd backend && npm run dev)
(cd frontend && npm run dev)
```

The backend listens on `http://localhost:3001` by default and the frontend on `http://localhost:3000`. Ensure PostgreSQL is accepting connections before running the migration. For an existing database or a different PostgreSQL setup, update `DATABASE_URL` in `backend/.env` accordingly.

The backend environment variables are:

| Variable | Purpose | Example/default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma | `postgresql://postgres:postgres@localhost:5432/orders_dev?schema=public` |
| `JWT_SECRET` | Secret used to sign JWTs | Set a private value for your environment; the example is a placeholder |
| `PORT` | Backend HTTP port | `3001` |

The frontend uses `NEXT_PUBLIC_API_URL` for the backend origin; its example value is `http://localhost:3001`. The `.env` and `.env.local` files are local configuration and should not be committed.

The seed creates `admin@example.com` with password `admin123`, 15 products, and 10 customers. **The seed deletes existing order items, orders, customers, products, and users before recreating these records. Run it only against a disposable development database.** Change the seeded password and JWT secret before using any non-local environment.

## Usage

Open `http://localhost:3000` and sign in with the seeded administrator account. Browse products, create orders by choosing a customer and one or more products, then review orders and pay or cancel them from the order list or detail page. Product creation and editing are available through the API; the current frontend only provides product browsing.

## API Documentation

Except for `POST /api/login`, send a valid bearer token on API requests:

```http
Authorization: Bearer <token>
```

### Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/login` | Authenticate and return a 12-hour JWT |
| `GET` | `/api/products?page=1&per_page=10&search=tea` | Paginated product list; optional name/code search |
| `POST` | `/api/products` | Create a product |
| `PUT` | `/api/products/:id` | Replace a product's code, name, price, and stock |
| `GET` | `/api/customers` | List customers |
| `POST` | `/api/customers` | Create a customer |
| `GET` | `/api/orders?page=1&per_page=10&status=PENDING&date_from=2026-01-01&date_to=2026-12-31` | Paginated order list with optional status and date filters |
| `POST` | `/api/orders` | Create an order |
| `GET` | `/api/orders/:id` | Get order details and items |
| `PATCH` | `/api/orders/:id/pay` | Change `PENDING` to `PAID` |
| `PATCH` | `/api/orders/:id/cancel` | Cancel a `PENDING` or `PAID` order and restore stock |
| `GET` | `/health` | Health check; returns `{ "status": "ok" }` |

Product creation and replacement use `product_code`, `name`, `price`, and `stock`. Price must be positive, stock must be a non-negative integer, and product codes must be unique. Customer fields are `name`, with optional `email`, `phone`, and `address`.

To create an order, send customer and product IDs with quantities. Do not send prices or totals; they are computed from current product records.

```bash
curl -X POST http://localhost:3001/api/orders \
   -H 'Authorization: Bearer <token>' \
   -H 'Content-Type: application/json' \
   -d '{"customer_id":"<customer-id>","items":[{"product_id":"<product-id>","quantity":2}]}'
```

Successful API responses have the form `{ "success": true, "message": "...", "data": ... }`. Paginated responses also include `meta` with `page`, `per_page`, and `total`. Errors have `success: false` and a message; validation/business errors may also include field-keyed `errors`. Common status codes include `201` for creation, `401` for missing or invalid authentication, `404` for missing records, `409` for invalid status transitions, and `422` for validation or business-rule failures.

## Available Commands

Run commands in their respective service directory.

| Directory | Command | Description |
| --- | --- | --- |
| `backend/` | `npm run dev` | Run the API in watch mode on port 3001 (or `PORT`) |
| `backend/` | `npm run build` | Compile TypeScript into `dist/` |
| `backend/` | `npm start` | Run the compiled API |
| `backend/` | `npm run typecheck` | Type-check without emitting files |
| `backend/` | `npm run db:migrate` | Apply development migrations with Prisma |
| `backend/` | `npm run db:generate` | Generate the Prisma client |
| `backend/` | `npm run db:seed` | Clear and repopulate the configured database with seed data |
| `backend/` | `npm test` | Run backend tests with Vitest |
| `frontend/` | `npm run dev` | Run Next.js development server on port 3000 |
| `frontend/` | `npm run build` | Build the frontend for production |
| `frontend/` | `npm start` | Serve the production frontend on port 3000 |
| `frontend/` | `npm run typecheck` | Type-check without emitting files |

There are no lint scripts or root-level npm scripts defined in the current package manifests.

### Tests

Tests use a separate `orders_test` database. With the local `orders-db` container running, create that database once, then run the test command from `backend/`:

```bash
docker exec orders-db psql -U postgres -c 'CREATE DATABASE orders_test'
cd backend && npm test
```

The test global setup applies migrations automatically. Tests reset their own fixtures; they do not use the development database. Override the default test connection by setting `TEST_DATABASE_URL` in the test environment.

## Contributing

There is no separate contribution guide in the repository. Keep changes scoped to the owning service, run its typecheck and relevant tests, and avoid committing environment files or credentials.

## License

No license is currently specified in the repository.
