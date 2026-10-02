FROM node:24-bookworm-slim
RUN npm install -g pnpm@11.7.0
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN pnpm install --filter @biem-one/admin... --frozen-lockfile --ignore-scripts && pnpm --filter @biem-one/admin build
RUN chown -R node:node /app/apps/admin/.next
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
USER node
EXPOSE 3001
CMD ["pnpm", "--filter", "@biem-one/admin", "start", "--port", "3001"]
