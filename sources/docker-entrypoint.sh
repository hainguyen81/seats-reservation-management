#!/bin/sh
set -e

cd /app

echo "🔌 Database Provider: $DATABASE_PROVIDER"

# Check if schema files exist, copy if missing
if [ ! -f prisma/schema.prisma ]; then
  if [ "$DATABASE_PROVIDER" = "postgres" ]; then
    [ -f prisma/schema.postgres.prisma ] && cp prisma/schema.postgres.prisma prisma/schema.prisma || echo "⚠️  schema.postgres.prisma not found"
  else
    [ -f prisma/schema.sqlite.prisma ] && cp prisma/schema.sqlite.prisma prisma/schema.prisma || echo "⚠️  schema.sqlite.prisma not found"
  fi
fi

# Check if prisma doesn't exist, install present project version 5.10.0
echo "📊 Running Prisma DB Push..."
[ ! -f /app/node_modules/.bin/prisma ] && npx prisma@5.10.0 db push
# Use pre-installed prisma binary from node_modules
# This prevents npx from auto-installing latest version
[ -f /app/node_modules/.bin/prisma ] && /app/node_modules/.bin/prisma db push

if [ "$SHOULD_SEED" = "true" ]; then
  echo "🚀 Seeding sample data..."
  /app/node_modules/.bin/prisma db seed
fi

echo "🎯 Executing core standalone server..."
exec node server.js
