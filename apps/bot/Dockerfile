# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/bot ./apps/bot
COPY packages/shared ./packages/shared

# Build shared package first, then bot
WORKDIR /app/packages/shared
RUN pnpm build

WORKDIR /app/apps/bot
RUN pnpm build

# Production stage
FROM node:22-slim AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/apps/bot/dist ./apps/bot/dist
COPY --from=builder /app/packages/shared ./packages/shared

WORKDIR /app/apps/bot

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
