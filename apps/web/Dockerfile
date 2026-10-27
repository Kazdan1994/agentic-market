# Build context is the repository root: docker compose build web
FROM node:26-slim AS build
RUN npm install -g corepack && corepack enable
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN yarn workspaces focus web
COPY apps/web apps/web
RUN yarn workspace web build

FROM nginx:alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
