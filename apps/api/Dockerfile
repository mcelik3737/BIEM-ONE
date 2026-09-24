FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --filter @biem-one/api...
RUN pnpm --filter @biem-one/api prisma generate
RUN pnpm --filter @biem-one/api build

EXPOSE 3000

CMD ["pnpm", "--filter", "@biem-one/api", "start:prod"]
