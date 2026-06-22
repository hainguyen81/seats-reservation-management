# ===================================================
# STEP 1: Install all dependencies (include devDependencies)
# ===================================================
# use node >= 22 for firebase 14
FROM node:22.14-alpine AS deps

# To make docker console show utf8 while composing
# alpine
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
# # ubuntu/debian
# ENV LANG=en_US.UTF-8
# ENV LANGUAGE=en_US:en
# ENV LC_ALL=en_US.UTF-8

# install required Prisma dependencies
RUN apk add --no-cache openssl libc6-compat gcompat

WORKDIR /app

# Debug
RUN echo "-------------------------------------------------" && \
  echo "🔄 STEP 1: [ DEPS ] Install all dependencies (include devDependencies)" && \
  echo "-------------------------------------------------"

# Copy package (from host folder to workdir)
COPY package.json package-lock.json* ./

# Copy Prisma (from host folder to workdir) to generate Client
COPY /prisma ./prisma

# Install dependecies into node_modules in image layer
RUN npm ci # installs fresh dependencies in Linux

# 💡 Force esbuild and prisma engine compability with Linux x64
RUN npm install @esbuild/linux-x64 --save-optional

# ===================================================
# STEP 2: Build
# ===================================================
# use node >= 22 for firebase 14
FROM node:22.14-alpine AS builder

# To make docker console show utf8 while composing
# alpine
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
# # ubuntu/debian
# ENV LANG=en_US.UTF-8
# ENV LANGUAGE=en_US:en
# ENV LC_ALL=en_US.UTF-8

# install required Prisma dependencies
RUN apk add --no-cache openssl libc6-compat gcompat

WORKDIR /app

# Debug
RUN echo "-------------------------------------------------" && \
  echo "⏳ STEP 2: [ Builder ] Build Next.js application" && \
  echo "-------------------------------------------------"

# Copy installed dependencies from node modules of deps layer
COPY --from=deps /app/node_modules ./node_modules

# Copy all host sources (out of .dockerignore) folder to this layer
COPY . .

# Setup Enviroment Variables to build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# -------------------------------------------------
# !!!IMPORTANT!!! Build prisma right after building project
# Due to seeding process will run at container start-up,
# at that moment, we dont need any .ts file(s) while they already imported in seed.ts
# Build prisma seeding by esbuild bundle to collect all import into 1 bundle for running at runtime:
# - `--bundle`: collect all related imported files into one output js file
# - `--platform=node --format=cjs`: run on Node.js platform
# - `--outdir=prisma`: output js file prisma/seed.js
# - `--external:@prisma/client`: mark @prisma/client as external imported module
# - call prisma seed runtime: `node prisma/seed.js`
# -------------------------------------------------
RUN echo "⚠️ Build prisma..."; \
  npm run prisma_esbuild; \
  cp prisma/schema.* prisma/dist/;

# Initial default prisma db provider or using from build arguments
ARG DATABASE_PROVIDER="sqlite"
ENV DATABASE_PROVIDER=$DATABASE_PROVIDER

# Build project
RUN if [ "$DATABASE_PROVIDER" = "postgres" ]; then \
  echo "🐘 Use POSTGRESQL..."; \
  cp prisma/schema.postgres.prisma prisma/dist/schema.prisma; \
  DATABASE_URL="postgresql://user:password@localhost:5432/seats_reservation" \
  DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/seats_reservation" \
  npx prisma generate; \
  DATABASE_URL="postgresql://user:password@localhost:5432/seats_reservation" \
  DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/seats_reservation" \
  npm run build; \
  else \
  echo "💾 Use SQLITE (Default)..."; \
  cp prisma/schema.sqlite.prisma prisma/dist/schema.prisma; \
  DATABASE_URL="file:./mock.db" \
  npx prisma generate; \
  DATABASE_URL="file:./mock.db" \
  npm run build; \
  fi

# Build done, prune production to make container smaller
RUN if [ "$NODE_ENV" = "production" ]; then \
  echo "✂️ Prune PRODUCTION..."; \
  npm prune --omit=dev; \
  fi

# Verify standalone server exists
RUN echo "✅ Build verification..." && \
  test -f .next/standalone/server.js && echo "✅ server.js found" || echo "❌ server.js NOT found" && \
  test -f package.json && echo "✅ package.json found" || echo "❌ package.json NOT found" && \
  test -f prisma/dist/seed.js && echo "✅ prisma/dist/seed.js found" || echo "❌ prisma/dist/seed.js NOT found"

# ===================================================
# STEP 3: Start application on Production (Image)
# ===================================================
# use node >= 22 for firebase 14
FROM node:22.14-alpine AS runner

# To make docker console show utf8 while composing
# alpine
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
# # ubuntu/debian
# ENV LANG=en_US.UTF-8
# ENV LANGUAGE=en_US:en
# ENV LC_ALL=en_US.UTF-8

# install required Prisma dependencies
RUN apk add --no-cache openssl libc6-compat gcompat

WORKDIR /app

# Debug
RUN echo "-------------------------------------------------" && \
  echo "🏃 STEP 3: [ Runner ] Start application on Production" && \
  echo "-------------------------------------------------"

# Debug
RUN echo "STEP 3: Start application on Production (Image)"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PROVIDER=sqlite
ENV SHOULD_SEED=false

# Create user, non-root to run container
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy package.json from builder layer
COPY --from=builder /app/package*.json ./

# Copy next built standalone from builder layer
COPY --from=builder /app/.next/standalone ./

# Copy other files/folders from builder layer
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma/schema.* ./prisma/
COPY --from=builder /app/prisma/dist ./prisma/dist

# -------------------------------------------------
# ⚠️ !!!IMPORTANT!!!: Grant write permission for prisma folder
# Fix permissions for prisma folder (needed for runtime schema swap)
# on /app, /home/nextjs, /app/prisma, app/package*.json
# -------------------------------------------------
RUN chown -R nextjs:nodejs /app && chmod -R 755 /app && \
  chown -R nextjs:nodejs /app/prisma && chmod -R 755 /app/prisma && \
  chown -R nextjs:nodejs /home/nextjs && chmod -R 755 /home/nextjs && \
  chmod 644 /app/package*.json

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER nextjs

# Verify server.js, package.json server exists
RUN echo "✅ Run verification..." && \
  test -f .next/standalone/server.js && echo "✅ server.js found" || echo "❌ server.js NOT found" && \
  test -f package.json && echo "✅ package.json found" || echo "❌ package.json NOT found" && \
  test -f prisma/dist/seed.js && echo "✅ prisma/dist/seed.js found" || echo "❌ prisma/dist/seed.js NOT found"

# expose container port
EXPOSE 3000

# Start application (include seeding sample data by environment `SHOULD_SEED`)
ENTRYPOINT ["docker-entrypoint.sh"]

