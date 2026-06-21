#!/bin/sh
set -e

cd /app

echo "⚙️ Database Provider: $DATABASE_PROVIDER"

# Check if schema files exist, copy if missing
if [ "$DATABASE_PROVIDER" = "postgres" ]; then
	[ -f prisma/schema.postgres.prisma ] && cp prisma/schema.postgres.prisma prisma/schema.prisma && cp prisma/schema.postgres.prisma prisma/dist/schema.prisma || echo "⚠️  schema.postgres.prisma not found"
else
	[ -f prisma/schema.sqlite.prisma ] && cp prisma/schema.sqlite.prisma prisma/schema.prisma && cp prisma/schema.sqlite.prisma prisma/dist/schema.prisma || echo "⚠️  schema.sqlite.prisma not found"
fi

if [ "$SHOULD_SEED" = "true" ]; then
  echo "🏃 Seeding sample data (npx seed)..."
  npm run prisma_push_generate_seed
else
  echo "🔄 Generate & Push Prisma (without seed)..."
  npm run prisma_push_generate
fi

echo "▶ Executing core standalone server..."
if [ "$SHOULD_SEED" = "true" ]; then
	npm run prod_seed_start
else
	npm run prod_prisma_start
fi