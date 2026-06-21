#!/bin/sh
set -e

cd /app

echo "⚙️ Database Provider: $DATABASE_PROVIDER"

# Check if schema files exist, copy if missing
if [ "$DATABASE_PROVIDER" = "postgres" ]; then
	[ -f prisma/schema.postgres.prisma ] && cp prisma/schema.postgres.prisma prisma/schema.prisma && cp prisma/schema.postgres.prisma prisma/dist/schema.prisma || echo "⚠️  schema.postgres.prisma not found"
else
	[ -f prisma/schema.sqlite.prisma ] && cp prisma/schema.sqlite.prisma prisma/schema.prisma && cp prisma/schema.sqlite.prisma prisma/dist/schema.prisma || echo "⚠️  schema.sqlite.prisma not found"

  # check to create SQLite db file if not found
  if [ -n "$DATABASE_URL" ]; then
    # sed `file:` prefix
    DB_PATH=$(echo "$DATABASE_URL" | sed 's/^file://')
    
    # parse parent folder path
    DB_DIR=$(dirname "$DB_PATH")
    
    # create folder if not found
    mkdir -p "$DB_DIR"
    
    # check file whether existed
    if [ ! -f "$DB_PATH" ]; then
      touch "$DB_PATH"
      chmod 666 "$DB_PATH"
      echo "✅ Created file DB successful from env: $DB_PATH"
    fi
  fi
fi

if [ "$SHOULD_SEED" = "true" ]; then
  echo "🏃 Seeding sample data (with seeding)..."
  npm run prisma_push_generate_seed
else
  echo "🔄 Generate & Push Prisma (without seeding)..."
  npm run prisma_push_generate
fi

echo "▶ Executing core standalone server..."
if [ "$SHOULD_SEED" = "true" ]; then
	npm run prod_seed_start
else
	npm run prod_prisma_start
fi