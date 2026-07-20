FROM node:24-alpine AS deps

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM node:24-alpine AS runner

WORKDIR /app
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

EXPOSE 3000
CMD ["pnpm", "start"]
