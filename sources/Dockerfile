# ===================================================
# STEP 1: Install all dependencies (include devDependencies)
# ===================================================
# use node >= 22 for firebase 14
FROM node:22.14-alpine AS deps
# install required Prisma dependencies
RUN apk add --no-cache openssl libc6-compat

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
RUN apk add --no-cache openssl libc6-compat

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

ARG DATABASE_PROVIDER="sqlite"
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER

# Copy correct schema prisma
RUN if [ "$DATABASE_PROVIDER" = "postgres" ]; then \
  echo "🔌 [Build-time] Config Prisma Next.js to POSTGRESQL..."; \
  cp prisma/schema.postgres.prisma prisma/schema.prisma; \
  else \
  echo "🔌 [Build-time] Config Prisma Next.js to SQLITE..."; \
  cp prisma/schema.sqlite.prisma prisma/schema.prisma; \
  fi
RUN npx prisma generate
RUN npm run build

# ===================================================
# STEP 3: Start application on Production (Image)
# ===================================================
# use node >= 22 for firebase 14
FROM node:22.14-alpine AS runner
WORKDIR /app

# Debug
RUN echo "STEP 3: Start application on Production (Image)"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create user, non-root to run container
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static files
COPY --from=builder /app/public ./public

# Copy standalone folders of Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Secure SQLITE in DOCKER
# Copy standalone Prisma Client, copy prisma folder
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# ⚠️ !!!IMPORTANT!!!: Grant write right for prisma folder
# to allow user 'nextjs' run 'cp' to swap schema file at runtime
USER root
RUN chown -R nextjs:nodejs /app/prisma
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 'db push' and 'db seed' for testing
# auto create file dev.db and load test data at start-up!
ARG DATABASE_PROVIDER="sqlite"
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER
ENV SHOULD_SEED="false"
CMD if [ "$DATABASE_PROVIDER"="postgres"]; then \
  echo "🔌 Use POSTGRESQL..."; \
  cp prisma/schema.postgres.prisma prisma/schema.prisma; \
  else \
  echo "🔌 Use SQLITE (Default)..."; \
  cp prisma/schema.sqlite.prisma prisma/schema.prisma; \
  fi && \
  npx prisma generate && \
  npx prisma db push && \
  if [ "$SHOULD_SEED" = "true" ]; then \
  echo "🚀 Seeding sample data..."; \
  npx prisma db seed; \
  fi && \
  node server.js
