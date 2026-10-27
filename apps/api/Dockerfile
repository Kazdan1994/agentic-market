# Build context is the repository root: docker compose build api
FROM node:26-slim AS base
RUN npm install -g corepack && corepack enable
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

FROM base AS build
RUN yarn workspaces focus api
COPY apps/api apps/api
RUN yarn workspace api build

FROM base AS runtime
ENV NODE_ENV=production
RUN yarn workspaces focus api --production
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
