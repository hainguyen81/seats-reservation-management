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
RUN npm install
RUN npm ci

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

# Debug
RUN echo "STEP 2: Build" \
    && echo "--- List directory ---" \
    && ls -la .

# Setup Enviroment Variables to build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy correct schema prisma (mock database URL for building)
ARG DATABASE_PROVIDER="sqlite"
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER
RUN if [ "$DATABASE_PROVIDER" = "postgres" ]; then \
  echo "🔌 Use POSTGRESQL..."; \
  cp prisma/schema.postgres.prisma prisma/schema.prisma; \
  DATABASE_URL="postgresql://mock:mock@localhost:5432/mock" DIRECT_DATABASE_URL="postgresql://mock:mock@localhost:5432/mock" npx prisma generate; \
  DATABASE_URL="postgresql://mock:mock@localhost:5432/mock" DIRECT_DATABASE_URL="postgresql://mock:mock@localhost:5432/mock" npm run build; \
  else \
  echo "🔌 Use SQLITE (Default)..."; \
  cp prisma/schema.sqlite.prisma prisma/schema.prisma; \
  DATABASE_URL="file:./mock.db" npx prisma generate; \
  DATABASE_URL="file:./mock.db" npm run build; \
  fi

# debug
RUN echo "🔍 Check standalone path (server.js): " && find .next/standalone -name server.js

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

# # Create user, non-root to run container
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# # Copy next standalone to application folder
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./seat-app

# # Copy static asset to application folder
# COPY --from=builder /app/public ./seat-app/public
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./seat-app/.next/static

# # Copy prisma to work dir (not application folder)
# COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# # ⚠️ !!!IMPORTANT!!!: Grant write right for prisma folder
# # to allow user 'nextjs' run 'cp' to swap schema file at runtime
# USER root
# RUN chown -R nextjs:nodejs /app
# RUN chmod -R 777 /app/prisma

# COPY built project to run
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# prisma require tsx to run
RUN npm install -g tsx

# USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 'db push' and 'db seed' for testing
# auto create file dev.db and load test data at start-up!
ENV DATABASE_PROVIDER="sqlite"
ENV SHOULD_SEED="false"
CMD if [ "$DATABASE_PROVIDER" = "postgres" ]; then \
  echo "🔌 Use POSTGRESQL..."; \
  cp prisma/schema.postgres.prisma prisma/schema.prisma; \
  else \
  echo "🔌 Use SQLITE (Default)..."; \
  cp prisma/schema.sqlite.prisma prisma/schema.prisma; \
  fi && \
  npx prisma db push && \
  if [ "$SHOULD_SEED" = "true" ]; then \
  echo "🚀 Seeding sample data..."; \
  npx prisma db seed; \
  fi && \
  REAL_SERVER_PATH=$(find . -name server.js | head -n 1) && \
  REAL_SERVER_DIR=$(dirname "$REAL_SERVER_PATH") && \
  echo "🎯 Next.js Target Execution Context: $REAL_SERVER_DIR" && \
  node server.js
