# syntax=docker/dockerfile:1

# Node 26 = Active LTS (hỗ trợ đến 2029-04-30). Rebuild với --pull để nhận bản vá mới nhất của tag.
ARG NODE_IMAGE=node:26-alpine

# ---- build: compile the React site and bundle the Node server ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:server

# ---- runtime: only the built output, no node_modules, no secrets ----
FROM ${NODE_IMAGE}
# Gỡ npm/npx/yarn/corepack đi kèm image: runtime không cần, và node_modules của chính npm
# là nơi chứa các CVE mà scanner báo.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
ENV NODE_ENV=production \
    PORT=3000 \
    DIST_DIR=/app/dist
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-server ./dist-server
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "dist-server/main.mjs"]
