# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

# Copy workspace manifests first so dependency installation stays cacheable.
COPY package.json package-lock.json ./
COPY apps/bff/package.json ./apps/bff/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm ci

COPY apps/bff ./apps/bff
COPY apps/frontend ./apps/frontend

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Install only runtime dependencies for the workspace application.
COPY package.json package-lock.json ./
COPY apps/bff/package.json ./apps/bff/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm ci --omit=dev && npm cache clean --force

COPY apps/bff/src ./apps/bff/src
COPY --from=build /app/apps/frontend/dist ./apps/frontend/dist

USER node

EXPOSE 4000

CMD ["node", "apps/bff/src/server.js"]
