#!/usr/bin/env bash
set -euo pipefail

# ForkCart Setup Script
# This script is run automatically by create-forkcart.
# You can also run it manually to reset your environment.

echo "🍴 Setting up ForkCart..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install it from https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || echo "⚠️  Docker not found. You'll need to provide your own PostgreSQL instance."

# Start database if docker-compose exists
if [ -f "docker-compose.yml" ] && command -v docker >/dev/null 2>&1; then
  echo "🐘 Starting PostgreSQL..."
  docker compose up -d
  sleep 3
fi

# Install dependencies
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
elif command -v yarn >/dev/null 2>&1; then
  yarn
else
  npm install
fi

# Run migrations
echo "📦 Running migrations..."
pnpm db:migrate 2>/dev/null || npm run db:migrate 2>/dev/null || echo "⚠️  Could not run migrations automatically."

echo ""
echo "✅ Setup complete! Run 'pnpm dev' to start."
