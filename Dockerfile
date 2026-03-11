# Stage 1: Install dependencies
FROM node:22-slim AS deps

WORKDIR /app

# Enable Corepack for Yarn 4
RUN corepack enable && corepack prepare yarn@4.13.0 --activate

# Copy package manifests and yarn config
COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/memory/package.json ./packages/memory/
COPY packages/gateway/package.json ./packages/gateway/
COPY packages/agent/package.json ./packages/agent/
COPY packages/skills/package.json ./packages/skills/
COPY packages/sandbox/package.json ./packages/sandbox/
COPY packages/tools/package.json ./packages/tools/
COPY packages/bot/package.json ./packages/bot/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN yarn install --immutable

# Stage 2: Build
FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.13.0 --activate

COPY --from=deps /app ./
COPY . .

RUN yarn build

# Stage 3: Production runtime
FROM node:22-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.13.0 --activate

ENV NODE_ENV=production

# Copy built output and production deps
COPY --from=builder /app/package.json /app/yarn.lock /app/.yarnrc.yml /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/bot/dist ./apps/bot/dist
COPY --from=builder /app/apps/bot/package.json ./apps/bot/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/config/package.json ./packages/config/
COPY --from=builder /app/packages/memory/dist ./packages/memory/dist
COPY --from=builder /app/packages/memory/package.json ./packages/memory/
COPY --from=builder /app/packages/gateway/dist ./packages/gateway/dist
COPY --from=builder /app/packages/gateway/package.json ./packages/gateway/
COPY --from=builder /app/packages/agent/dist ./packages/agent/dist
COPY --from=builder /app/packages/agent/package.json ./packages/agent/
COPY --from=builder /app/packages/skills/dist ./packages/skills/dist
COPY --from=builder /app/packages/skills/package.json ./packages/skills/
COPY --from=builder /app/packages/sandbox/dist ./packages/sandbox/dist
COPY --from=builder /app/packages/sandbox/package.json ./packages/sandbox/
COPY --from=builder /app/packages/tools/dist ./packages/tools/dist
COPY --from=builder /app/packages/tools/package.json ./packages/tools/
COPY --from=builder /app/packages/bot/dist ./packages/bot/dist
COPY --from=builder /app/packages/bot/package.json ./packages/bot/

# Create non-root user
RUN groupadd --gid 1001 disclaw && \
    useradd --uid 1001 --gid disclaw --create-home disclaw

USER disclaw

EXPOSE 18789

CMD ["node", "apps/bot/dist/index.js"]
