#!/bin/sh
set -e

cd /app

if [ "$DATABASE_PROVIDER" = "postgres" ]; then
  echo "🔌 Use POSTGRESQL..."
  cp prisma/schema.postgres.prisma prisma/schema.prisma
else
  echo "🔌 Use SQLITE (Default)..."
  cp prisma/schema.sqlite.prisma prisma/schema.prisma
fi

npx prisma db push

if [ "$SHOULD_SEED" = "true" ]; then
  echo "🚀 Seeding sample data..."
  npx prisma db seed
fi

echo "🎯 Executing core standalone server..."
node server.js
