# ===================================================
# STEP 1: Install all dependencies (include devDependencies)
# ===================================================
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package
COPY package.json package-lock.json* ./
# Copy Prisma to generate Client
COPY prisma ./prisma

RUN npm ci

# ===================================================
# STEP 2: Build
# ===================================================
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Setup Enviroment Variables to build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma Client and build Next.js
RUN npx prisma generate
RUN npm run build

# ===================================================
# STEP 3: Start application on Production (Image)
# ===================================================
FROM node:18-alpine AS runner
WORKDIR /app

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

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 'db push' and 'db seed' for testing
# auto create file dev.db and load test data at start-up!
ENV SHOULD_SEED="false"
CMD npx prisma db push && \
    if [ "$SHOULD_SEED" = "true" ]; then \
        echo "🚀 SHOULD_SEED=true: Seeding sample data (Seeding)..."; \
        npx prisma db seed; \
      else \
        echo "🔒 SHOULD_SEED=false: Ignore seeding sample data."; \
    fi && \
    node server.js
