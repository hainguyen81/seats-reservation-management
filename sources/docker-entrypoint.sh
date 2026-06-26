#!/bin/sh
set -e

cd /app

echo "⚙️ Database Provider: $DATABASE_PROVIDER"

# Check for PROD/DEV
if [ "$NODE_ENV" = "production" ]; then
	[ -f tsconfig.prod.json ] && cp tsconfig.prod.json tsconfig.json || echo "⚠️ tsconfig.prod.json not found"
else
	[ -f tsconfig.dev.json ] && cp tsconfig.dev.json tsconfig.json || echo "⚠️ tsconfig.dev.json not found"
fi

# Check if schema files exist, copy if missing
if [ "$DATABASE_PROVIDER" = "postgres" ]; then
	[ -f prisma/schema.postgres.prisma ] && cp prisma/schema.postgres.prisma prisma/schema.prisma && cp prisma/schema.postgres.prisma prisma/dist/schema.prisma || echo "⚠️ schema.postgres.prisma not found"
else
	[ -f prisma/schema.sqlite.prisma ] && cp prisma/schema.sqlite.prisma prisma/schema.prisma && cp prisma/schema.sqlite.prisma prisma/dist/schema.prisma || echo "⚠️ schema.sqlite.prisma not found"
fi

if [ "$SHOULD_SEED" = "true" ]; then
  echo "🏃 Seeding sample data (with seeding)..."
  npm run prisma_push_generate_seed_docker
else
  echo "🔄 Generate & Push Prisma (without seeding)..."
  npm run prisma_push_generate
fi

if [ "$NODE_ENV" = "production" ]; then
  echo "▶ [ PRODUCTION MODE ] Executing core standalone server..."
  if [ "$SHOULD_SEED" = "true" ]; then
    npm run prod_seed_start_docker
  else
    npm run prod_prisma_start
  fi
else
  echo "▶ [ DEVELOPMENT MODE ] Executing core standalone server..."
  if [ "$SHOULD_SEED" = "true" ]; then
    npm run dev_seed_docker
  else
    npm run dev_prisma_docker
  fi
fi