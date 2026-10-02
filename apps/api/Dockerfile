FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* && npm install -g pnpm@11.7.0
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --filter @biem-one/api... --frozen-lockfile --ignore-scripts
RUN pnpm --filter @biem-one/api exec prisma generate && pnpm --filter @biem-one/api build
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
