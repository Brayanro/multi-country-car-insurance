FROM node:24.15.0-bookworm-slim AS workspace
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@11.29.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json
RUN pnpm install --frozen-lockfile
COPY shared/ shared/
RUN pnpm --filter @quote/contract build

FROM workspace AS frontend-build
COPY frontend/ frontend/
RUN pnpm --filter quote-web build

FROM nginx:1.28.3-alpine AS web
COPY deploy/quote.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist/quote-web/browser/ /usr/share/nginx/html/

FROM workspace AS cms
ENV NODE_ENV=production
COPY backend/ backend/
COPY frontend/public/icons/TABLER-LICENSE.txt backend/TABLER-LICENSE.txt
RUN pnpm --filter quote-cms build
WORKDIR /app/backend
EXPOSE 1337
CMD ["node", "scripts/start.mjs"]
