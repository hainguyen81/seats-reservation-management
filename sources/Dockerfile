# ===================================================
# STEP 1: Install all dependencies (include devDependencies)
# ===================================================
# use node >= 22 for firebase 14
FROM node:22.14-alpine AS deps
# install required Prisma dependencies
RUN apk add --no-cache openssl libc6-compat gcompat

WORKDIR /app

# Debug
RUN echo "STEP 1: Install all dependencies (include devDependencies)"

# Copy package
COPY package.json package-lock.json* ./

# Copy Prisma to generate Client
COPY prisma ./prisma

# Generate Prisma Client and build Next.js
RUN npm ci # installs fresh dependencies in Linux

# 💡 Force esbuild and prisma engine compability with Linux x64
RUN npm install @esbuild/linux-x64 --save-optional

# ===================================================
# STEP 2: Build
# ===================================================
# use node >= 22 for firebase 14
FROM node:22.14-alpine AS builder
# install required Prisma dependencies
RUN apk add --no-cache openssl libc6-compat gcompat

WORKDIR /app

# Copy project and node modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Setup Enviroment Variables to build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy correct schema prisma (mock database URL for building)
ARG DATABASE_PROVIDER="sqlite"
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER

RUN if [ "$DATABASE_PROVIDER" = "postgres" ]; then \
  echo "🔌 Use POSTGRESQL..."; \
  cp prisma/schema.postgres.prisma prisma/schema.prisma; \
  DATABASE_URL="postgresql://user:password@localhost:5432/seats_reservation" \
  DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/seats_reservation" \
  npx prisma generate; \
  DATABASE_URL="postgresql://user:password@localhost:5432/seats_reservation" \
  DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/seats_reservation" \
  npm run build; \
  else \
  echo "🔌 Use SQLITE (Default)..."; \
  cp prisma/schema.sqlite.prisma prisma/schema.prisma; \
  DATABASE_URL="file:./mock.db" \
  npx prisma generate; \
  DATABASE_URL="file:./mock.db" \
  npm run build; \
  fi

# Verify standalone server exists
RUN echo "✅ Build verification..." && \
    test -f .next/standalone/server.js && echo "✅ server.js found" || echo "❌ server.js NOT found"
RUN ls -la /app/.next/standalone/ || echo "❌ .next/standalone/ does not exist"

# ===================================================
# STEP 3: Start application on Production (Image)
# ===================================================
# use node >= 22 for firebase 14
FROM node:22.14-alpine AS runner
# install required Prisma dependencies
RUN apk add --no-cache openssl libc6-compat gcompat

WORKDIR /app

# Debug
RUN echo "STEP 3: Start application on Production (Image)"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PROVIDER=sqlite
ENV SHOULD_SEED=false

# Create user, non-root to run container
# RUN addgroup --system --gid 1001 nodejs && \
#     adduser --system --uid 1001 nextjs

# Copy next standalone to application folder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# In runner stage, after copying prisma from builder:
RUN if [ ! -f prisma/schema.prisma ]; then \
  cp "prisma/schema.${DATABASE_PROVIDER}.prisma" prisma/schema.prisma || true; \
  fi

# Install runtime dependencies only (tsx for seed script)
# RUN npm install -g tsx @esbuild/linux-x64

# ⚠️ !!!IMPORTANT!!!: Grant write right for prisma folder
# Fix permissions for prisma folder (needed for runtime schema swap)
# RUN chown -R nextjs:nodejs /app && chmod -R 755 /app && chmod -R 777 /app/prisma

# Copy entrypoint script
# COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/
# RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
# USER nextjs

EXPOSE 3000

# Start application
ENTRYPOINT ["docker-entrypoint.sh"]

