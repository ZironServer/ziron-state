FROM node:22 AS build
WORKDIR /usr/app/
COPY . .
RUN npm ci
RUN npm run build


FROM node:22-slim

LABEL description="Ziron state"

WORKDIR /usr/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /usr/app/dist ./dist

HEALTHCHECK --interval=15s --timeout=15s --start-period=10s \
   CMD node node_modules/ziron-server/dist/healthcheck.js d-7777

EXPOSE 7777

CMD node dist/run.js