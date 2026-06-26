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
  if [ "$NODE_ENV" = "production" ]; then
	  [ -f prisma/schema.postgres.prisma ] && cp prisma/schema.postgres.prisma prisma/schema.prisma && cp prisma/schema.postgres.prisma prisma/dist/schema.prisma || echo "⚠️ schema.postgres.prisma not found"
  else
    [ -f prisma/schema.postgres.prisma ] && cp prisma/schema.postgres.prisma prisma/schema.prisma || echo "⚠️ schema.postgres.prisma not found"
  fi
else
  if [ "$NODE_ENV" = "production" ]; then
	  [ -f prisma/schema.sqlite.prisma ] && cp prisma/schema.sqlite.prisma prisma/schema.prisma && cp prisma/schema.sqlite.prisma prisma/dist/schema.prisma || echo "⚠️ schema.sqlite.prisma not found"
  else
    [ -f prisma/schema.sqlite.prisma ] && cp prisma/schema.sqlite.prisma prisma/schema.prisma || echo "⚠️ schema.sqlite.prisma not found"
  fi
fi

echo
if [ "$SHOULD_SEED" = "true" ]; then
  echo "-------------------------------------------------"
  echo "🏃 Seeding sample data (with seeding)..."
  echo "-------------------------------------------------"
  if [ "$NODE_ENV" = "production" ]; then
    npm run prisma_push_generate_seed_docker
  else
    npm run prisma_push_generate_seed
  fi
else
  echo "-------------------------------------------------"
  echo "🔄 Generate & Push Prisma (without seeding)..."
  echo "-------------------------------------------------"
  npm run prisma_push_generate
fi

echo
if [ "$NODE_ENV" = "production" ]; then
  echo "-------------------------------------------------"
  echo " 🚀 PRODUCTION MODE ACTIVE"
  echo " ⚡ Optimizing performance & security..."
  echo "-------------------------------------------------"
  npm run start
else
  echo "-------------------------------------------------"
  echo " 🛠️  DEVELOPMENT MODE ACTIVE"
  echo " 🐛 Debugging features enabled..."
  echo "-------------------------------------------------"
  npm run dev
fi