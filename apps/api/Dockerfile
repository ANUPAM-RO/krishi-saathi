# Build from the repository root:  docker build -f apps/api/Dockerfile -t krishi-saathi-api .
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @krishi/api --workspace @krishi/shared --include-workspace-root --ignore-scripts

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @krishi/shared \
 && npx --workspace @krishi/api prisma generate \
 && npm run build -w @krishi/api \
 && npm prune --omit=dev --workspace @krishi/api --workspace @krishi/shared --include-workspace-root

FROM node:22-alpine
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma

WORKDIR /repo/apps/api
USER node
EXPOSE 4000
# Apply pending migrations, then start. With several replicas, run migrations as a separate release step instead.
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && node dist/main"]
