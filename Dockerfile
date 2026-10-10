# syntax=docker/dockerfile:1

# ---- build: compile the React site and bundle the Node server ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:server

# ---- runtime: only the built output, no node_modules, no secrets ----
FROM node:22-alpine
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
