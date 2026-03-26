# My ForkCart Store

This project was bootstrapped with [`create-forkcart`](https://github.com/forkcart/forkcart).

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended), npm, or yarn
- PostgreSQL 16+ (or Docker)

### Development

```bash
# Start the database (if using Docker)
docker compose up -d

# Start all services
pnpm dev
```

| Service    | URL                   |
| ---------- | --------------------- |
| Storefront | http://localhost:3000 |
| Admin      | http://localhost:3001 |
| API        | http://localhost:4000 |

### Default Admin Credentials

Check your `.env` file for `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Project Structure

```
├── packages/
│   ├── storefront/    # Next.js storefront
│   ├── admin/         # Admin dashboard
│   ├── api/           # REST/GraphQL API
│   ├── core/          # Business logic
│   └── database/      # Prisma schema & migrations
├── .env               # Environment variables
└── docker-compose.yml # PostgreSQL (optional)
```

## Documentation

Visit [forkcart.com/docs](https://forkcart.com/docs) for full documentation.

## License

MIT
