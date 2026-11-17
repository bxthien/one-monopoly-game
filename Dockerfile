# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace and package files
COPY package.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install all dependencies
RUN npm install

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY packages/client/ ./packages/client/

# Build all packages (shared, server, client)
RUN npm run build

# ==========================================
# Stage 2: Production Runner
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy root package.json and workspace package.json files
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled outputs from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the Fastify + Socket.io server which serves static client files
CMD ["node", "packages/server/dist/server.js"]
