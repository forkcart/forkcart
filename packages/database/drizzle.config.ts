import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schemas/*.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://forkcart:forkcart@localhost:5432/forkcart',
  },
});
